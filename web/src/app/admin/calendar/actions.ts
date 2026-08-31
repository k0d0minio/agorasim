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

/** "3 days" / "1 day" — the confirmation reads back what was done. */
function days(n: number): string {
  return `${n} ${n === 1 ? "day" : "days"}`;
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
 * Open or close departures, and set how many drivers they have.
 *
 * `drivers` and `note` are written on a close as well as an open: closing the
 * 20th because there is a wedding, then reopening it, should not silently
 * reset the roster — and the note is *why*, which is the part the team will
 * want next month.
 */
export async function setAvailability(
  _prevState: AvailabilityActionState,
  formData: FormData,
): Promise<AvailabilityActionState> {
  const actor = await requireAdmin();

  const parsed = setAvailabilitySchema.safeParse(formValues(formData));
  if (!parsed.success) return { error: "Couldn't read which days to change." };

  const { slots, status, drivers, note } = parsed.data;
  const dates = addressedDays(parsed.data);
  if (dates.length === 0) return { error: "No days were selected." };
  if (slots.length === 0) return { error: "Pick at least one departure." };

  let written: DateKey[];
  try {
    const rows = await upsertDays({ dates, slots, status, drivers, note });
    written = Array.from(new Set(rows.map((row) => row.date)));
  } catch (err) {
    console.error("[admin] failed to write availability", err);
    return { error: "Couldn't save — the calendar was not changed." };
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
      drivers,
      hasNote: Boolean(note),
      // A season closed in one gesture reads back as one, rather than as three
      // hundred loose days somebody has to reconstruct.
      ...(parsed.data.from && parsed.data.to
        ? { range: { from: parsed.data.from, to: parsed.data.to } }
        : {}),
    },
  });

  revalidatePublicSite();

  const departures = written.length * slots.length;
  return {
    ok: true,
    changed: departures,
    message:
      status === "open"
        ? `${days(written.length)} on sale (${departures} departures), ${drivers} ${drivers === 1 ? "driver" : "drivers"} each.`
        : `${days(written.length)} closed.`,
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
  if (!parsed.success) return { error: "Couldn't read which days to clear." };

  const { slots } = parsed.data;
  const dates = addressedDays(parsed.data);
  if (dates.length === 0) return { error: "No days were selected." };
  if (slots.length === 0) return { error: "Pick at least one departure." };

  let sold: Set<string>;
  try {
    sold = await datesWithBookings({ dates, slots });
  } catch (err) {
    // Refuse rather than proceed: the check exists to protect a sold day, and
    // a check that fails open is not a check.
    console.error("[admin] couldn't check for bookings before clearing days", err);
    return { error: "Couldn't check for bookings, so nothing was cleared. Try again." };
  }

  if (sold.size > 0) {
    const listed = [...sold].sort().join(", ");
    return {
      error:
        `${listed} ${sold.size === 1 ? "has" : "have"} bookings on ${sold.size === 1 ? "it" : "them"}, ` +
        "so nothing was cleared. Close the day instead — the bookings stay visible.",
    };
  }

  let removed: number;
  try {
    removed = await clearDays({ dates, slots });
  } catch (err) {
    console.error("[admin] failed to clear availability", err);
    return { error: "Couldn't save — the calendar was not changed." };
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
    message: `${removed} ${removed === 1 ? "departure" : "departures"} cleared — back to "not decided".`,
  };
}
