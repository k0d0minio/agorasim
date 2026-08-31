"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/admin-auth";
import {
  clearDays,
  expandDateRange,
  upsertDays,
  type DateKey,
} from "@/lib/availability";
import { datesWithBookings } from "@/lib/bookings";
import { recordAuditOrWarn } from "@/lib/audit";
import {
  clearAvailabilitySchema,
  formValues,
  setAvailabilitySchema,
} from "@/lib/form-schemas";

/**
 * Writing the bookable calendar.
 *
 * These are the only writes to the `availability` table. They follow the house
 * rules for admin actions (see the note at the top of `app/admin/actions.ts`):
 * authorize first with `requireAdmin()`, audit through the single writer in
 * `lib/audit.ts`, and report failures to the operator instead of swallowing
 * them.
 *
 * They also revalidate the public site, for the same reason the catalogue
 * actions do: `/reservar` renders this data and is cached, so a day opened here
 * and nowhere else would be a day Rita can see and a guest cannot buy.
 *
 * **One departure, one day and a whole season are the same action.** The
 * calendar's tap-a-day sheet, its "open the rest of the month" button and its
 * seasonal window all post the same form; what differs is how many `dates`
 * fields there are, or whether a `from`/`to` pair replaces them. Three actions
 * would mean three schemas, three audit shapes and three places for the upsert
 * to drift.
 *
 * **The calendar is not per tour any more.** A row is one departure of the
 * whole business — see `lib/availability.ts` — so these actions take no
 * experience slug and closing the 20th closes it for everything.
 */

/** The public pages read availability; they are cached, so bust them. */
function revalidatePublicSite(): void {
  revalidatePath("/", "layout");
}

export type AvailabilityActionState = {
  ok?: boolean;
  error?: string;
  message?: string;
  /** How many departures the write actually touched, for the confirmation line. */
  changed?: number;
};

/** "3 dias" / "1 dia" — the confirmation reads back what was done. */
function days(n: number): string {
  return `${n} ${n === 1 ? "dia" : "dias"}`;
}

/**
 * The days one submission addresses: the ones it listed, plus the ones its
 * range covers.
 *
 * Both, not either. The day sheet posts `dates`, the season card posts
 * `from`/`to`, and nothing stops a future control from posting both — the
 * union is what every one of those means. `expandDateRange` caps the range, so
 * a crafted `to` in 2999 costs one bounded loop rather than a third of a
 * million rows.
 */
function addressedDays(input: {
  dates: DateKey[];
  from?: DateKey;
  to?: DateKey;
}): DateKey[] {
  const ranged =
    input.from && input.to ? expandDateRange(input.from, input.to) : [];
  return Array.from(new Set([...input.dates, ...ranged])).sort();
}

/**
 * Open or close departures, and — when the form says so — set how many drivers
 * they have and why.
 *
 * `drivers` and `note` are written on a close as well as an open: closing the
 * 20th because there is a wedding, then reopening it, should not silently
 * reset the roster — and the note is *why*, which is the part the team will
 * want next month.
 *
 * **A form that does not post them does not change them.** The day sheet
 * renders both fields and always posts both, so it can set a roster and clear
 * a note; the month sweeps and the season window post neither, and so leave
 * every note and every adjusted roster in the range exactly as they were.
 * `upsertDays` is where that distinction is enforced — the schema's job is only
 * to turn "not posted" into `undefined` rather than into a default.
 */
export async function setAvailability(
  _prevState: AvailabilityActionState,
  formData: FormData,
): Promise<AvailabilityActionState> {
  const actor = await requireAdmin();

  const parsed = setAvailabilitySchema.safeParse(formValues(formData));
  if (!parsed.success) return { error: "Não foi possível perceber que dias mudar." };

  const { slots, status, drivers, note } = parsed.data;
  const dates = addressedDays(parsed.data);
  if (dates.length === 0) return { error: "Não foi selecionado nenhum dia." };
  if (slots.length === 0) return { error: "Escolha pelo menos uma partida." };

  let written: DateKey[];
  try {
    const rows = await upsertDays({ dates, slots, status, drivers, note });
    written = Array.from(new Set(rows.map((row) => row.date)));
  } catch (err) {
    console.error("[admin] failed to write availability", err);
    return { error: "Não foi possível guardar — o calendário não mudou." };
  }

  await recordAuditOrWarn({
    actorUserId: actor.id,
    action: status === "open" ? "availability.opened" : "availability.closed",
    entityType: "availability",
    // A day, not a row id: bulk writes touch many rows, and "which days" is the
    // question anyone reading this log back is actually asking.
    entityId: written.length === 1 ? written[0] : null,
    after: {
      dates: written,
      slots,
      status,
      // Only recorded when the write actually set them. A sweep leaves both
      // alone, and an audit line reading `drivers: 2` would be asserting a
      // change that never happened — which is the sort of entry somebody
      // reconstructs a bug from six months later.
      ...(drivers === undefined ? {} : { drivers }),
      ...(note === undefined ? {} : { hasNote: note !== null }),
      // A season closed in one gesture reads back as one, rather than as three
      // hundred loose days somebody has to reconstruct.
      ...(parsed.data.from && parsed.data.to
        ? { range: { from: parsed.data.from, to: parsed.data.to } }
        : {}),
    },
  });

  revalidatePublicSite();

  const departures = written.length * slots.length;
  // The roster clause only when the write set one — a sweep that left the
  // rosters alone must not report a number it did not write.
  const roster =
    drivers === undefined
      ? ""
      : `, ${drivers} ${drivers === 1 ? "condutor" : "condutores"} cada`;
  return {
    ok: true,
    changed: departures,
    message:
      status === "open"
        ? `${days(written.length)} à venda (${departures} partidas)${roster}.`
        : `${days(written.length)} fechados.`,
  };
}

/**
 * Forget days entirely.
 *
 * Different from closing them, and the difference is worth the second action:
 * a closed day is a decision the calendar records and can show a reason for, an
 * absent day is one nobody has made. Absence is also the default, so this is
 * the undo for "I opened the wrong month".
 *
 * **A day that has been sold cannot be forgotten.** Clearing it would leave a
 * guest holding a booking for a day the calendar has no opinion about — the
 * tour still happens, but nothing on the admin's screens says so. Closing it is
 * still allowed, and is the right move for "we have to cancel the 20th": the
 * day stops taking new bookings, the existing ones stay visible, and calling
 * those guests is a conversation, not a database change.
 */
export async function clearAvailability(
  _prevState: AvailabilityActionState,
  formData: FormData,
): Promise<AvailabilityActionState> {
  const actor = await requireAdmin();

  const parsed = clearAvailabilitySchema.safeParse(formValues(formData));
  if (!parsed.success) return { error: "Não foi possível perceber que dias limpar." };

  const { slots } = parsed.data;
  const dates = addressedDays(parsed.data);
  if (dates.length === 0) return { error: "Não foi selecionado nenhum dia." };
  if (slots.length === 0) return { error: "Escolha pelo menos uma partida." };

  let sold: Set<string>;
  try {
    sold = await datesWithBookings({ dates, slots });
  } catch (err) {
    // Refuse rather than proceed: the check exists to protect a sold day, and
    // a check that fails open is not a check.
    console.error("[admin] couldn't check for bookings before clearing days", err);
    return {
      error:
        "Não foi possível verificar se havia reservas, por isso nada foi limpo. " +
        "Tente novamente.",
    };
  }

  if (sold.size > 0) {
    const listed = [...sold].sort().join(", ");
    return {
      error:
        `${listed} ${sold.size === 1 ? "tem reservas" : "têm reservas"}, por isso nada ` +
        "foi limpo. Feche o dia em vez disso — as reservas continuam visíveis.",
    };
  }

  let removed: number;
  try {
    removed = await clearDays({ dates, slots });
  } catch (err) {
    console.error("[admin] failed to clear availability", err);
    return { error: "Não foi possível guardar — o calendário não mudou." };
  }

  await recordAuditOrWarn({
    actorUserId: actor.id,
    action: "availability.cleared",
    entityType: "availability",
    entityId: dates.length === 1 ? dates[0] : null,
    before: { dates, slots },
  });

  revalidatePublicSite();

  return {
    ok: true,
    changed: removed,
    message:
      removed === 1
        ? "1 partida limpa — volta a não estar decidida."
        : `${removed} partidas limpas — voltam a não estar decididas.`,
  };
}
