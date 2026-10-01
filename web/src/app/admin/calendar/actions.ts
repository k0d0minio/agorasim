"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { requireAdmin } from "@/lib/admin-auth";
import {
  checkSlotAvailable,
  expandDateRange,
  isDateKey,
  MAX_RANGE_DAYS,
  setDayRoster,
  setDepartureStates,
  todayKey,
  TOUR_SLOTS,
  type DateKey,
} from "@/lib/availability";
import { bookingRef, bookingsBetween, slotOccupancyOn } from "@/lib/bookings";
import { recordAuditOrWarn } from "@/lib/audit";
import { listCatalogue } from "@/lib/experience-catalogue";
import { BOOKING_CURRENCY } from "@/lib/money";
import { priceBooking } from "@/lib/pricing";
import { enquiryRef } from "@/lib/sales";
import { db, bookings, tourRequests, type BookingLineItem } from "@/db";
import {
  blockDaysSchema,
  createManualBookingSchema,
  dayRosterSchema,
  formValues,
  type DayBlock,
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
 * actions do: `/reservar` renders this data and is cached, so a day blocked
 * here and nowhere else would be a day Rita has taken off and a guest can
 * still buy.
 *
 * **Every departure is open unless the team blocks it** (`open-by-default`),
 * so the calendar has two writes and no "open" tool at all: the bar's
 * block/unblock over a day or a stretch ({@link blockDays}), and the day
 * panel's roster and note ({@link saveDayRoster}). Neither touches what the
 * other one owns — blocking a day keeps its roster and its note, and saving
 * the roster keeps the day blocked.
 *
 * **The calendar is not per tour.** A row is one departure of the whole
 * business — see `lib/availability.ts` — so these actions take no experience
 * slug and blocking the 20th blocks it for everything.
 */

/** The public pages read availability; they are cached, so bust them. */
function revalidatePublicSite(): void {
  revalidatePath("/", "layout");
}

export type AvailabilityActionState = {
  ok?: boolean;
  error?: string;
  message?: string;
};

/** "3 dias" / "1 dia" — the confirmation reads back what was done. */
function days(n: number): string {
  return `${n} ${n === 1 ? "dia" : "dias"}`;
}

/** Which departures each bar button leaves blocked, and which on sale (D-17). */
const BLOCKS: Record<
  DayBlock,
  { closed: ("morning" | "afternoon")[]; open: ("morning" | "afternoon")[] }
> = {
  day: { closed: ["morning", "afternoon"], open: [] },
  morning: { closed: ["morning"], open: ["afternoon"] },
  afternoon: { closed: ["afternoon"], open: ["morning"] },
  none: { closed: [], open: ["morning", "afternoon"] },
};

/** The confirmation line, in the words of the button that was pressed. */
function blockMessage(block: DayBlock, n: number): string {
  switch (block) {
    case "day":
      return n === 1 ? "1 dia bloqueado." : `${n} dias bloqueados.`;
    case "morning":
      return `Manhã bloqueada em ${days(n)}; a tarde fica à venda.`;
    case "afternoon":
      return `Tarde bloqueada em ${days(n)}; a manhã fica à venda.`;
    case "none":
      return n === 1 ? "1 dia desbloqueado." : `${n} dias desbloqueados.`;
  }
}

/**
 * Block or unblock a day or a stretch — the calendar's bar.
 *
 * The form posts the stretch's two ends (a single day posts `from` alone) and
 * which of the four buttons was pressed; the server expands the stretch,
 * capped at `MAX_RANGE_DAYS`, and drops any day already in the past, which
 * the grid never offers but a stale tab could still post.
 *
 * **Bookings stay** (D-8). Blocking a departure stops new sales and nothing
 * else: a guest who already paid for the 20th still has the 20th, and calling
 * them is a conversation, not a database change. The confirmation the
 * operator answered before this ran said so, with the count.
 *
 * The form never carries a roster or a note, and `setDepartureStates` writes
 * only the status, so a day's "1 condutor" and its "Casamento" survive a block
 * and an unblock.
 */
export async function blockDays(
  _prevState: AvailabilityActionState,
  formData: FormData,
): Promise<AvailabilityActionState> {
  const actor = await requireAdmin();

  const parsed = blockDaysSchema.safeParse(formValues(formData));
  if (!parsed.success || !parsed.data.from) {
    return { error: "Não foi possível perceber que dias mudar." };
  }

  const { from, block } = parsed.data;
  const to = parsed.data.to ?? from;
  const today = todayKey();
  const dates = expandDateRange(from, to).filter((date) => date >= today);
  if (dates.length === 0) return { error: "Não foi selecionado nenhum dia." };

  const { closed, open } = BLOCKS[block];
  let changed: { closed: number; opened: number };
  try {
    changed = await setDepartureStates({ dates, closed, open });
  } catch (err) {
    console.error("[admin] failed to write availability", err);
    return { error: "Não foi possível guardar — o calendário não mudou." };
  }

  await recordAuditOrWarn({
    actorUserId: actor.id,
    action: closed.length > 0 ? "availability.closed" : "availability.opened",
    entityType: "availability",
    // A day, not a row id: a stretch touches many rows, and "which days" is
    // the question anyone reading this log back is actually asking.
    entityId: dates.length === 1 ? dates[0] : null,
    after: {
      range: { from: dates[0], to: dates[dates.length - 1] },
      days: dates.length,
      blocked: closed,
      unblocked: open,
      changed,
    },
  });

  revalidatePublicSite();

  return { ok: true, message: blockMessage(block, dates.length) };
}

/**
 * Set a day's roster and note — the panel's "Mais opções".
 *
 * Both departures alike: the panel is about a day, and "Diogo is off on the
 * 14th" is true of the 10:00 and the 14:00. The status is never touched, so a
 * blocked day stays blocked and an untouched one stays on sale.
 */
export async function saveDayRoster(
  _prevState: AvailabilityActionState,
  formData: FormData,
): Promise<AvailabilityActionState> {
  const actor = await requireAdmin();

  const parsed = dayRosterSchema.safeParse(formValues(formData));
  if (!parsed.success || !parsed.data.date) {
    return { error: "Não foi possível perceber que dia mudar." };
  }

  const { date, drivers } = parsed.data;
  if (date < todayKey()) return { error: "Este dia já passou." };
  // The panel always posts the field, so absent is as good as emptied.
  const note = parsed.data.note ?? null;

  try {
    await setDayRoster({ date, drivers, note });
  } catch (err) {
    console.error("[admin] failed to write a day's roster", err);
    return { error: "Não foi possível guardar — o calendário não mudou." };
  }

  await recordAuditOrWarn({
    actorUserId: actor.id,
    action: "availability.roster_changed",
    entityType: "availability",
    entityId: date,
    after: { date, slots: [...TOUR_SLOTS], drivers, hasNote: note !== null },
  });

  revalidatePublicSite();

  return {
    ok: true,
    message: `${drivers} ${drivers === 1 ? "condutor" : "condutores"} em cada partida.`,
  };
}

/** Live bookings per departure, for the bar and the block confirmation. */
export type BookingCounts = { morning: number; afternoon: number };

/**
 * How many live bookings sit on each departure of a stretch.
 *
 * The bar's summary and the block confirmation's warning (D-8) read it. The
 * page already sends the bookings of the month on screen, so the calendar
 * calls this only for a stretch that runs into another month — where the
 * client has nothing to count. Capped like the write, so a crafted range costs
 * one bounded query.
 */
export async function countLiveBookings(
  from: DateKey,
  to: DateKey,
): Promise<BookingCounts | null> {
  await requireAdmin();
  if (!isDateKey(from) || !isDateKey(to) || to < from) return null;

  const span = expandDateRange(from, to);
  if (span.length === 0) return null;
  const last = span.length === MAX_RANGE_DAYS ? span[span.length - 1] : to;

  try {
    const rows = await bookingsBetween({ from, to: last });
    return {
      morning: rows.filter((row) => row.slot === "morning").length,
      afternoon: rows.filter((row) => row.slot === "afternoon").length,
    };
  } catch (err) {
    console.error("[admin] couldn't count the bookings in a stretch", err);
    return null;
  }
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
 *
 * **Two ways in, one action.** The Calendar's day sheet sells a day it already
 * knows about, and there is no enquiry behind the call. The Sales board sells
 * *this* enquiry — Rita is answering it as she types — and posts its `leadId`,
 * which moves that lead to `booked` rather than creating a second one, and
 * names it in the audit trail. Everything else about the sale is identical,
 * which is the point: a second action would be a second capacity check.
 */
/** The source enquiry, as much of it as the sale needs. */
async function readLead(id: string) {
  const [lead] = await db
    .select({
      id: tourRequests.id,
      status: tourRequests.status,
      locale: tourRequests.locale,
    })
    .from(tourRequests)
    .where(eq(tourRequests.id, id))
    .limit(1);
  return lead ?? null;
}

export async function createManualBooking(
  _prevState: ManualBookingActionState,
  formData: FormData,
): Promise<ManualBookingActionState> {
  const actor = await requireAdmin();

  const parsed = createManualBookingSchema.safeParse(formValues(formData));
  if (!parsed.success) {
    const { fieldErrors } = z.flattenError(parsed.error);
    // The lead is a hidden field: there is no box for the operator to correct,
    // so it is said at the top of the sheet rather than under a field.
    if (fieldErrors.leadId?.[0]) return { error: fieldErrors.leadId[0] };
    return {
      fieldErrors: {
        date: fieldErrors.date?.[0],
        slot: fieldErrors.slot?.[0],
        experience: fieldErrors.experience?.[0],
        party:
          fieldErrors.adults?.[0] ??
          fieldErrors.children?.[0] ??
          fieldErrors.infants?.[0],
        name: fieldErrors.name?.[0],
        email: fieldErrors.email?.[0],
      },
    };
  }

  const {
    leadId,
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

  // The enquiry this sale answers, read before a single row is written: a
  // stale id from a board left open since yesterday must not leave a confirmed
  // booking attached to nothing.
  const source = leadId ? await readLead(leadId) : null;
  if (leadId && !source) return { error: "Esse pedido já não existe." };

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
    // The phone booking skips the notice, the six-month window and the block;
    // capacity still binds (D-4).
    audience: "team",
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
    /*
      One person, one card. Opened from a day in the Calendar there is no
      enquiry behind the call, so the lead is born here — `source = 'phone'`,
      `status = 'booked'`, which keeps the board from mistaking a sold booking
      for an unanswered lead ("booking" belongs to the checkout's machine
      writes). Opened from the Sales board there already *is* one, and
      inserting a second would put the same couple on the board twice: one
      card carrying the money and one still sitting in `Novo`. So that row is
      moved on instead — and its `source` is left exactly as it was, because
      where a lead came from is a fact about the past, not about who closed it.

      Either way the contact details written are the ones just submitted: the
      operator is on the phone with this person, and the mistyped address they
      have just read back is the whole reason the fields are editable.

      On the moved lead the route, the party, the day and the add-ons are set
      to what was *sold*, not to what was asked for — the card is read as the
      booking from here on, and a card still showing the Manzwine stop this
      sale does not include is how a driver sets off for a winery nobody paid
      for. The enquiry as it arrived survives in the audit trail and in the
      guest's own message, which is where "what did they originally want?"
      belongs.
    */
    const [lead] = source
      ? await db
          .update(tourRequests)
          .set({
            name,
            email,
            phone,
            experienceSlug: tour.slug,
            addOns,
            partySize: quoted.seats,
            preferredDate: date,
            status: "booked",
            updatedAt: now,
          })
          .where(eq(tourRequests.id, source.id))
          .returning({ id: tourRequests.id })
      : await db
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

    // The lead was deleted between the read above and this write. Rare, and
    // worth its own sentence: the generic "tente novamente" would have the
    // operator retry a sale that can never land.
    if (!lead) return { error: "Esse pedido já não existe." };

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
        // The language this guest is written to in. A lead knows it; a call
        // that arrived without one is Portuguese, as it always was here.
        locale: source?.locale ?? "pt",
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
        // Which enquiry this sale came out of — the id and the handle the team
        // quotes, never the person. `bookings` holds no name, email or phone by
        // design, and this entry keeps that property.
        sourceEnquiryId: source?.id ?? lead.id,
        sourceEnquiryRef: enquiryRef(source?.id ?? lead.id),
        /*
          Whether the enquiry was already there. A phone call with no lead
          behind it creates one, and an audit trail that showed both the same
          way could not answer "did Rita convert a website enquiry, or write
          this booking from scratch?" — which is the marketing question the
          board exists to make answerable.
        */
        sourceEnquiryExisting: source !== null,
      },
    });

    /*
      The stage move, as its own entry against the lead.

      It has to be here and not folded into the booking entry above: the lead's
      own page reads `listAuditForEntity("tour_request", id)` for its Histórico,
      so a move recorded only against the booking would leave a card that
      silently jumped from `Novo` to `Reservado` with nobody's name on it.
    */
    if (source) {
      await recordAuditOrWarn({
        actorUserId: actor.id,
        action: "tour_request.status_changed",
        entityType: "tour_request",
        entityId: source.id,
        before: { status: source.status },
        after: { status: "booked", bookingRef: bookingRef(booking.id) },
      });
    }
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
