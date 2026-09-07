"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAdmin } from "@/lib/admin-auth";
import {
  checkSlotAvailable,
  clearDays,
  expandDateRange,
  upsertDays,
  type DateKey,
} from "@/lib/availability";
import { datesWithBookings, slotOccupancyOn } from "@/lib/bookings";
import { recordAuditOrWarn } from "@/lib/audit";
import { listCatalogue } from "@/lib/experience-catalogue";
import { BOOKING_CURRENCY } from "@/lib/money";
import { priceBooking } from "@/lib/pricing";
import { db, bookings, tourRequests, type BookingLineItem } from "@/db";
import {
  clearAvailabilitySchema,
  createManualBookingSchema,
  formValues,
  setAvailabilitySchema,
  type ManualBookingField,
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

export type ManualBookingActionState = {
  ok?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: Partial<Record<ManualBookingField, string>>;
};

/**
 * Record a sale that never touched Stripe.
 *
 * Every row in `bookings` is born inside Checkout and owns a payment intent;
 * that is how the whole pipeline is built. But a tour also gets sold on the
 * phone, or settled in cash in the car park — and a sale the calendar cannot
 * count is a slot the website sells twice. This is the one path that writes a
 * `payment_method = 'cash'` row: confirmed from creation (it never holds, it
 * was agreed there and then), no Stripe ids by construction, so every money
 * view and every refund reconcile against what was actually agreed.
 *
 * **The agreed price is the truth, not a guess.** The catalogue prices the
 * basket and that figure is the default, but the box stays editable: that a
 * deal was struck — usually lower — and a breakdown that claims the catalogue
 * price while the guest paid less is the exact fiction audit trails exist to
 * catch. When the agreed figure differs, an `acordo` line makes the breakdown
 * add up to the charge (negative = discount).
 *
 * **The same capacity checks as the checkout.** This path exists because the
 * phone rings; ringing does not create a car. `checkSlotAvailable` runs the
 * same read as `/reservar`, and a departure at capacity is refused in
 * Portuguese rather than overbooked.
 *
 * The tour-request side stays honest too: `status = 'booked'` and
 * `source = 'phone'` keep the sales board from mistaking a sold booking for an
 * unanswered lead ("booking" belongs to the checkout's machine writes).
 */
export async function createManualBooking(
  _prevState: ManualBookingActionState,
  formData: FormData,
): Promise<ManualBookingActionState> {
  const actor = await requireAdmin();

  const parsed = createManualBookingSchema.safeParse(formValues(formData));
  if (!parsed.success) {
    const { fieldErrors } = z.flattenError(parsed.error);
    return {
      fieldErrors: {
        date: fieldErrors.date?.[0],
        slot: fieldErrors.slot?.[0],
        experience: fieldErrors.experience?.[0],
        party: fieldErrors.party ?? fieldErrors.adults?.[0] ?? fieldErrors.children?.[0] ?? fieldErrors.infants?.[0],
        name: fieldErrors.name?.[0],
        email: fieldErrors.email?.[0],
      },
    };
  }

  const {
    date,
    slot,
    experience,
    mode,
    addOns,
    adults,
    children,
    infants,
    name,
    email,
    phone,
    amount,
  } = parsed.data;

  const catalogue = await listCatalogue();
  const tour = catalogue.find((entry) => entry.slug === experience);
  if (!tour || tour.kind !== "signature" || !tour.active) {
    return { fieldErrors: { experience: "Esta experiência não está à venda." } };
  }

  const quoted = priceBooking({
    tour: { slug: tour.slug, pricing: tour.pricing },
    addOns: [],
    mode,
    party: { adults, children, infants },
    date,
  });
  if (!quoted.ok) {
    switch (quoted.reason) {
      case "party-too-large":
        return {
          fieldErrors: {
            party: `Esta experiência não pode levar mais do que ${quoted.maxAdults} adultos.`,
          },
        };
      case "min-adults":
        return {
          fieldErrors: { party: `Esta experiência precisa de ao menos ${quoted.min} adultos.` },
        };
      case "bad-party":
        return { fieldErrors: { party: "Diga quantos adultos vêm (1 a 8)." } };
      default:
        // Unpriced, mode unsupported, add-on rules: with an empty add-on basket
        // the add-on reasons are unreachable, so they read back as the tour
        // itself not being on sale in this format.
        return { fieldErrors: { experience: "Esta experiência não está à venda neste formato." } };
    }
  }

  const fit = await checkSlotAvailable({
    experienceSlug: tour.slug,
    date,
    slot,
    partySize: quoted.seats,
    occupancy: await slotOccupancyOn(date, slot),
  });
  if (!fit.ok) {
    switch (fit.reason) {
      case "no-vehicle":
        return {
          fieldErrors: { slot: "O carro que esta partida precisa já está reservado." },
        };
      case "party-too-large":
        return {
          fieldErrors: { party: "Esta partida já não tem lugar para este grupo." },
        };
      case "bad-party":
        return { fieldErrors: { party: "Diga quantos adultos vêm (1 a 8)." } };
      case "unreadable":
        return {
          error: "Não foi possível confirmar a disponibilidade — tente novamente.",
        };
      case "invalid":
      case "unavailable":
        return { fieldErrors: { slot: "Esta partida não está à venda." } };
    }
  }

  const agreedCents = amount ?? quoted.totalCents;
  const lines: BookingLineItem[] = [...quoted.lines];
  if (agreedCents !== quoted.totalCents) {
    lines.push({
      slug: "acordo",
      kind: "tour",
      unit: "group",
      unitCents: agreedCents - quoted.totalCents,
      quantity: 1,
    });
  }

  const now = new Date();
  try {
    const [lead] = await db
      .insert(tourRequests)
      .values({
        name,
        email,
        phone,
        locale: "pt",
        kind: "tour",
        experienceSlug: tour.slug,
        addOns,
        partySize: quoted.seats,
        preferredDate: date,
        status: "booked",
        source: "phone",
      })
      .returning({ id: tourRequests.id });

    const [booking] = await db
      .insert(bookings)
      .values({
        tourRequestId: lead.id,
        date,
        slot,
        experienceSlug: tour.slug,
        addOns,
        mode,
        adults,
        children,
        infants,
        vehicleClass: fit.vehicleClass,
        partySize: quoted.seats,
        amountCents: agreedCents,
        currency: BOOKING_CURRENCY,
        priceBreakdown: lines,
        status: "confirmed",
        locale: "pt",
        paymentMethod: "cash",
        holdExpiresAt: now,
        confirmedAt: now,
      })
      .returning({ id: bookings.id });

    await recordAuditOrWarn({
      actorUserId: actor.id,
      action: "booking.created",
      entityType: "booking",
      entityId: booking.id,
      after: {
        date,
        slot,
        experienceSlug: tour.slug,
        partySize: quoted.seats,
        amountCents: agreedCents,
        paymentMethod: "cash",
      },
    });
  } catch (err) {
    console.error("[admin] failed to create a manual booking", err);
    return { error: "Não foi possível registar a reserva — tente novamente." };
  }

  revalidatePublicSite();

  return {
    ok: true,
    message: "Reserva registada e confirmada.",
  };
}
