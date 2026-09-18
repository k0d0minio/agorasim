/**
 * Moving a paid booking to another departure — the weather reschedule.
 *
 * The client's stated policy for bad weather is reschedule first and refund
 * only in extreme conditions (info PDF §1.4), and until now the only tool for
 * it was cancel-and-rebook: two rows, a refund, a second checkout, and a
 * payment the new booking is not linked to. This module is the other answer —
 * the booking stays the same booking, and its departure changes.
 *
 * **A move is a sale, re-checked.** The target departure has to pass exactly
 * the test a new booking would pass: the day is open, a driver is free, and the
 * class of car this party needs is free (`lib/availability.ts` over
 * `lib/fleet.ts`). Nothing here re-implements that rule — it calls
 * {@link checkSlotAvailable}, the same function the checkout calls, because a
 * second copy of the capacity arithmetic is how a Saturday ends up sold twice.
 *
 * **In place, and audited.** There is no history table and no "moved" status:
 * the row is edited and the audit log carries the before and the after
 * (`register default` in the ticket). That is enough to answer "what was this
 * booking before Rita touched it?", which is the question a guest standing at a
 * meeting point on the wrong morning produces. Nothing personal goes into those
 * entries — `bookings` holds no name, email or phone by design, so the redaction
 * `lib/audit.ts` asks for is satisfied by construction rather than by a filter.
 *
 * **The guest is told, in confirmation form.** `lib/booking-emails.ts` sends
 * them the details block again with the new departure and the meeting point,
 * naming the day it used to be — see {@link guestMoveEmail}. A move nobody was
 * told about is worse than no move at all.
 *
 * **The money is not touched.** A move is not a refund and not a re-price: the
 * party, the route and the total are the same facts they were, so no Stripe
 * call happens here at all. A guest who should pay a different amount is a
 * cancel-and-rebook, which the Sales board already does.
 */
import "server-only";

import { and, eq } from "drizzle-orm";

import { bookings, db, tourRequests, type Booking } from "@/db";
import { bookingEmails } from "@/content/emails";
import {
  departureLabel,
  departureTimeFollowsByEmail,
  meetingPoints,
} from "@/content/logistics";
import { t } from "@/i18n/config";
import { recordAuditOrWarn } from "@/lib/audit";
import {
  checkSlotAvailable,
  fitsParty,
  formatDay,
  isDateKey,
  isTourSlot,
  todayKey,
  type DateKey,
  type DaySlots,
} from "@/lib/availability";
import {
  groupDepartures,
  readDepartureWindow,
  sameDeparture,
  type Departure,
  type DepartureGroup,
} from "@/lib/departure-window";
import { guestMoveEmail, partyLabel } from "@/lib/booking-emails";
import { bookingRef, slotOccupancyOn } from "@/lib/bookings";
import {
  cancellationPath,
  isCancellationTokenConfigured,
  issueCancellationToken,
} from "@/lib/cancellation-token";
import { isEmailConfigured } from "@/lib/email";
import { listCatalogue } from "@/lib/experience-catalogue";
import { sendLoggedEmail } from "@/lib/message-log";
import { formatPrice } from "@/lib/money";
import { siteUrl } from "@/lib/site-origin";

/**
 * How far ahead the move picker looks for somewhere to put a booking.
 *
 * Three months, not the calendar's eighteen. A reschedule is "the forecast for
 * Saturday is filthy, when else can these people come?", which is answered in
 * weeks — and the picker ships every viable departure to the browser, so the
 * horizon is also the size of the payload. A move further out than this is a
 * conversation, and the team can still open the day and move it in two steps.
 */
export const MOVE_HORIZON_DAYS = 90;

/**
 * One departure a booking could be moved to — or the one it is on.
 *
 * The shared {@link Departure} under the move picker's own name: what makes a
 * departure a *move target* is the filtering below, not its shape.
 */
export type MoveTarget = Departure;

/**
 * Whether a booking can be moved at all.
 *
 * `confirmed` and nothing else, exactly as `isCancellable` has it: a `pending`
 * row is a hold that will release itself, and a cancelled, refunded or expired
 * one is over — moving any of them would edit a departure nobody is coming to
 * and email somebody about a tour that is not happening.
 */
export function isMovable(booking: Pick<Booking, "status">): boolean {
  return booking.status === "confirmed";
}

/**
 * The departures this party could be moved to, out of the ones described.
 *
 * Pure, and the whole of the picker's rule: a target is viable when the same
 * {@link fitsParty} that decides a sale says yes to *this* route and *this*
 * party — so a departure with only the T3 left is not offered for a couple who
 * need a small classic, and a day nobody has opened is not offered at all. The
 * booking's own departure is excluded: it is not a move, and the action would
 * refuse it anyway.
 */
export function viableMoveTargets(options: {
  days: DaySlots[];
  experienceSlug: string;
  partySize: number;
  /** The departure the booking is on now. */
  from: MoveTarget;
}): MoveTarget[] {
  const { days, experienceSlug, partySize, from } = options;

  return days.flatMap((day) =>
    day.slots
      .filter(
        (departure) =>
          !sameDeparture({ date: day.date, slot: departure.slot }, from) &&
          fitsParty(departure, experienceSlug, partySize).ok,
      )
      .map((departure) => ({ date: day.date, slot: departure.slot })),
  );
}

/**
 * Every departure this booking could be moved to, from today to the horizon.
 *
 * The window read is {@link readDepartureWindow}, shared with the Sales board's
 * manual booking; what is particular to a move is the filter below it.
 */
export async function listMoveTargets(
  booking: Pick<Booking, "experienceSlug" | "partySize" | "date" | "slot">,
  options: { today?: DateKey; horizonDays?: number } = {},
): Promise<MoveTarget[]> {
  const { today = todayKey(), horizonDays = MOVE_HORIZON_DAYS } = options;

  return viableMoveTargets({
    days: await readDepartureWindow({ today, horizonDays }),
    experienceSlug: booking.experienceSlug,
    partySize: booking.partySize,
    from: { date: booking.date, slot: booking.slot },
  });
}

/** The picker's options for one day: the day, named, and its viable departures. */
export type MoveOptionGroup = DepartureGroup;

/**
 * Group move targets by day and name them, for the dialog to render — the
 * shared {@link groupDepartures}, under the name the move picker's caller uses.
 */
export const groupMoveTargets = groupDepartures;

/** What happened when the team tried to move a booking. */
export type MoveOutcome =
  | { status: "moved"; booking: Booking; from: MoveTarget }
  | { status: "not-found" }
  /** Not a paid booking — cancelled, refunded, expired, or still a hold. */
  | { status: "not-movable"; booking: Booking }
  /** The target is where it already is. Nothing to do, and nothing to email. */
  | { status: "same-departure"; booking: Booking }
  /** The posted date or departure is not one this engine recognises. */
  | { status: "invalid" }
  /** The target cannot take this party — the re-check's own reason. */
  | {
      status: "unavailable";
      reason: "unavailable" | "no-vehicle" | "party-too-large" | "bad-party" | "unreadable";
    };

/**
 * Move a paid booking to another departure.
 *
 * Never throws for anything a caller can be told about; the outcome union is
 * the report, as in `cancelAndRefundBooking`. The audit entry and the guest's
 * email are best-effort *after* the row has changed, for the same reason: the
 * booking has moved, and failing the operator's action because a mail server
 * was slow would have them do it again and move it twice.
 *
 * The update is guarded on the departure it is moving *from* as well as on the
 * status, so two operators pressing the button at once produce one move: the
 * loser finds the booking somewhere else and is told so, rather than dragging
 * it to a third departure whose capacity nobody checked.
 */
export async function moveBookingToDeparture(options: {
  bookingId: string;
  date: string;
  slot: string;
  /** The operator, for the audit entry. Never `null` — a move has a person. */
  actorUserId: string;
  today?: DateKey;
}): Promise<MoveOutcome> {
  const { bookingId, date, slot, actorUserId, today } = options;

  if (!isDateKey(date) || !isTourSlot(slot)) return { status: "invalid" };

  const [existing] = await db
    .select()
    .from(bookings)
    .where(eq(bookings.id, bookingId))
    .limit(1);

  if (!existing) return { status: "not-found" };
  if (!isMovable(existing)) return { status: "not-movable", booking: existing };

  const from: MoveTarget = { date: existing.date, slot: existing.slot };
  const to: MoveTarget = { date, slot };
  if (sameDeparture(from, to)) return { status: "same-departure", booking: existing };

  // The same check the checkout runs, against the same occupancy count. The
  // booking's own driver and car are committed on the departure it is leaving,
  // never on this one, so nothing has to be subtracted here.
  const check = await checkSlotAvailable({
    experienceSlug: existing.experienceSlug,
    date,
    slot,
    partySize: existing.partySize,
    occupancy: await slotOccupancyOn(date, slot),
    today,
  });

  if (!check.ok) {
    return check.reason === "invalid"
      ? { status: "invalid" }
      : { status: "unavailable", reason: check.reason };
  }

  const now = new Date();
  const [moved] = await db
    .update(bookings)
    .set({
      date,
      slot,
      // Re-stated from the check rather than carried over: the class a booking
      // holds is the class that was just verified free, and reusing the stored
      // one would be trusting a decision made against a different departure.
      vehicleClass: check.vehicleClass,
      updatedAt: now,
    })
    .where(
      and(
        eq(bookings.id, existing.id),
        eq(bookings.status, "confirmed"),
        eq(bookings.date, from.date),
        eq(bookings.slot, from.slot),
      ),
    )
    .returning();

  // Somebody else moved or cancelled it between the read and the write. The
  // row that is there now is the truth, not the one this request set out with.
  if (!moved) {
    const [after] = await db
      .select()
      .from(bookings)
      .where(eq(bookings.id, existing.id))
      .limit(1);
    return { status: "not-movable", booking: after ?? existing };
  }

  await recordAuditOrWarn({
    actorUserId,
    action: "booking.moved",
    entityType: "booking",
    entityId: moved.id,
    // Both departures in full. "Moved to the 22nd" a year later is not an
    // answer to "where was this booking before?", which is the only question
    // this entry exists for — and neither half carries anything about the
    // guest, because the row it is drawn from holds nothing about them.
    before: { date: from.date, slot: from.slot, vehicleClass: existing.vehicleClass },
    after: {
      ref: bookingRef(moved.id),
      date: moved.date,
      slot: moved.slot,
      vehicleClass: moved.vehicleClass,
    },
  });

  await sendMoveEmail(moved, from);

  return { status: "moved", booking: moved, from };
}

/**
 * Tell the guest where their tour went. Best-effort and never throws.
 *
 * **The cancel link is re-issued here, and written back only if the mail
 * leaves.** The link in their original confirmation names a departure that no
 * longer exists, and a moved guest is exactly the one who may want out — but a
 * booking must never be left holding a digest whose only plaintext was in a
 * message that failed to send. So the token is minted, put in this mail, and
 * persisted after the send reports success; if it does not, the row keeps
 * the digest it had and the guest's old link still works. A `duplicate` is not
 * a success here for that purpose: no mail left, so the freshly minted token's
 * plaintext reached nobody and must not replace the digest the guest holds.
 *
 * **Through the message log, under `booking-moved`/`guest`, keyed on the date
 * moved to.** A second press of the button sends nothing; a second, real move
 * is a different date and so a different message, and the guest is told about
 * it. The gap that leaves is a booking moved back to a day it has already been
 * moved to — the same key, so no second notice. That is the price of having no
 * move history to count against (`register default`), and it is the rarer
 * mistake than telling a guest twice.
 */
async function sendMoveEmail(booking: Booking, from: MoveTarget): Promise<void> {
  if (!isEmailConfigured()) return;
  if (!booking.tourRequestId) {
    console.warn(`[booking] ${bookingRef(booking.id)} has no lead row — no move email sent`);
    return;
  }

  try {
    const [lead] = await db
      .select()
      .from(tourRequests)
      .where(eq(tourRequests.id, booking.tourRequestId))
      .limit(1);

    if (!lead?.email) {
      console.warn(`[booking] ${bookingRef(booking.id)} has no address — no move email sent`);
      return;
    }

    const catalogue = new Map((await listCatalogue()).map((entry) => [entry.slug, entry]));
    const locale = booking.locale;
    // A retired route still has to be nameable to the guest who bought it; the
    // slug is a poor name but never a blank — same rule as the other mails.
    const name = (slug: string) => {
      const entry = catalogue.get(slug);
      return entry ? t(entry.title, locale) : slug;
    };

    const issued = isCancellationTokenConfigured() ? await issueCancellationToken() : null;

    const result = await sendLoggedEmail(
      {
        kind: "booking-moved",
        recipient: "guest",
        bookingId: booking.id,
        tourRequestId: booking.tourRequestId,
        // The date it moved *to*, which is what this mail is about.
        subjectDate: booking.date,
      },
      guestMoveEmail({
        ref: bookingRef(booking.id),
        guestName: lead.name,
        guestEmail: lead.email,
        guestPhone: lead.phone,
        locale,
        date: formatDay(booking.date, locale),
        previousDate: formatDay(from.date, locale),
        previousDeparture: t(departureLabel(booking.experienceSlug, from.slot), locale),
        experience: `${name(booking.experienceSlug)} — ${t(bookingEmails.guest.modeWords[booking.mode], locale)}`,
        departure: t(departureLabel(booking.experienceSlug, booking.slot), locale),
        departureTimeFollows: departureTimeFollowsByEmail(booking.experienceSlug),
        meetingPoint: meetingPoints[booking.experienceSlug] ?? null,
        addOns: booking.addOns.map(name),
        partySize: booking.partySize,
        partyLabel: partyLabel(booking, locale),
        total: formatPrice(booking.amountCents, locale, booking.currency),
        adminUrl: `${siteUrl()}/admin/sales/${lead.id}`,
        cancelUrl: issued
          ? `${siteUrl()}${cancellationPath(locale, issued.token)}`
          : null,
      }),
    );

    if (result.status !== "sent") {
      if (result.status === "duplicate") {
        // Not an error — this booking has already been told about this date. Said
        // out loud all the same: before the log, every move that did not mail left
        // a line, and a silent return is the one outcome nobody could account for.
        console.info(
          `[booking] ${bookingRef(booking.id)} moved to ${booking.date} — already notified, no second mail`,
        );
      } else {
        console.error(
          `[booking] ${bookingRef(booking.id)} moved but the guest email was not sent (${result.reason})`,
        );
      }
      return;
    }

    if (issued) {
      await db
        .update(bookings)
        .set({ cancellationTokenHash: issued.digest, updatedAt: new Date() })
        .where(eq(bookings.id, booking.id));
    }
  } catch (err) {
    console.error(`[booking] ${bookingRef(booking.id)} moved but the guest email failed`, err);
  }
}
