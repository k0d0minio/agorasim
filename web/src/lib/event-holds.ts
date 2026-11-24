/**
 * Event holds: a wedding or event whose deposit is paid takes its whole day.
 *
 * The client's rule (run `event-holds-capacity`, D-1): a deposit-paid event
 * takes both departures of its date out of the drivers-and-cars pool — Diogo
 * is at the wedding in the 4L, so neither the 10:00 nor the 14:00 leaves.
 *
 * **Derived, never stored** (D-2). Nothing here writes to `availability`: a
 * quote *holds* its `event_date` for exactly as long as its status says the
 * deposit is settled, and stops the moment it is `cancelled`. There is no row
 * to reopen on a refund, so a day Rita blocked stays blocked and an open day is
 * open again — and a day she unblocks *after* the deposit is still held.
 *
 * The hold is merged into the one occupancy count every reader shares
 * (`countSlotOccupancy` in `lib/bookings.ts`), which is how the public
 * calendar, the checkout re-check, the enquiry form, the manual booking and a
 * booking move all refuse a held day without a line of their own.
 *
 * Server-only: it imports `@/db`. The predicate and the merge are pure and
 * unit-tested through the `server-only` stub.
 */
import "server-only";

import { and, asc, eq, inArray, isNotNull, isNull, or, sql } from "drizzle-orm";

import { db, quotes, tourRequests, type EnquiryKind, type QuoteStatus } from "@/db";
import type { DateKey } from "@/lib/availability";
import type { OccupancyGroup, SlotOccupancy } from "@/lib/bookings";
import { noVehicles } from "@/lib/fleet";
import { heldDepartures, tourHoldOf, type TourHold } from "@/lib/tour-quote";

/**
 * The quote statuses that hold their date.
 *
 * `deposit_paid` covers a deposit paid through Stripe *and* one the team wrote
 * off as paid by bank transfer — `statusAfterPayment` in `lib/quotes.ts` moves
 * both to it, because the date is just as held either way. `paid` keeps
 * holding: a settled balance does not free the day. `draft` and `sent` hold
 * nothing — a quote on the table is not a date anybody has paid for.
 */
export const QUOTE_HOLDING_STATUSES = ["deposit_paid", "paid"] as const satisfies readonly QuoteStatus[];

/** Whether a quote in this status holds its event's whole day. */
export function quoteHoldsDate(quote: { status: QuoteStatus }): boolean {
  return (QUOTE_HOLDING_STATUSES as readonly QuoteStatus[]).includes(quote.status);
}

/** The departures a hold takes — the whole day, as the client answered. */
const HELD_SLOTS = ["morning", "afternoon"] as const;

/**
 * A wedding or event quote, in SQL — the complement of `isTourQuote`
 * (`lib/tour-quote.ts`). Keep the two in step: `kind` is the marker, and a row
 * with a car is a tour quote whatever its `kind` says.
 */
function isEventQuoteSql() {
  return and(eq(quotes.kind, "event"), isNull(quotes.holdVehicleClass));
}

/** A tour quote, in SQL. Keep in step with `isTourQuote`. */
function isTourQuoteSql() {
  return or(eq(quotes.kind, "tour"), isNotNull(quotes.holdVehicleClass));
}

/** One quote holding one date — what the occupancy merge needs, and no more. */
export type EventHoldKey = { date: DateKey; quoteId: string };

/**
 * Fold event holds into an occupancy map, in place, and return it.
 *
 * Both departures of each held date gain the quote in `eventHolds`, creating
 * the entry when no booking made one. Driver and car counts are left alone:
 * they are bookings, and the day sheet still has to say how many tours are
 * already on a day an event landed on. What makes the day unsellable is the
 * hold itself, read by `describeSlot`.
 */
export function applyEventHolds(
  occupancy: Map<string, SlotOccupancy>,
  holds: readonly EventHoldKey[],
): Map<string, SlotOccupancy> {
  for (const hold of holds) {
    for (const slot of HELD_SLOTS) {
      const key = `${hold.date}#${slot}`;
      const entry = occupancy.get(key) ?? { drivers: 0, vehicles: noVehicles() };
      const held = entry.eventHolds ?? [];
      if (!held.includes(hold.quoteId)) {
        entry.eventHolds = [...held, hold.quoteId];
      }
      occupancy.set(key, entry);
    }
  }
  return occupancy;
}

/** The holding quotes' dates between two day keys — the occupancy's half. */
export async function eventHoldKeysBetween(options: {
  from: DateKey;
  to: DateKey;
}): Promise<EventHoldKey[]> {
  const { from, to } = options;
  return db
    .select({ date: quotes.eventDate, quoteId: quotes.id })
    .from(quotes)
    .where(
      and(
        // `quotes_status_event_date_idx` — status first, then the date.
        inArray(quotes.status, [...QUOTE_HOLDING_STATUSES]),
        sql`${quotes.eventDate} between ${from} and ${to}`,
        // A tour quote holds its departure, not the day: `tourQuoteHoldsBetween`.
        isEventQuoteSql(),
      ),
    );
}

/**
 * One held day, as the Calendar's day sheet lists it.
 *
 * The couple's name comes from the enquiry, as a booking's does, and is null
 * when there is none or it was erased — the event still renders, name-less.
 * Admin-only: nothing here may reach a public page.
 */
export type EventHold = {
  quoteId: string;
  tourRequestId: string | null;
  date: DateKey;
  /** `wedding` or `event`; null when the enquiry is gone. */
  kind: EnquiryKind | null;
  name: string | null;
  venue: string | null;
};

/** The holding events between two day keys, in date order. */
export async function eventHoldsBetween(options: {
  from: DateKey;
  to: DateKey;
}): Promise<EventHold[]> {
  const { from, to } = options;
  const rows = await db
    .select({
      quoteId: quotes.id,
      tourRequestId: quotes.tourRequestId,
      date: quotes.eventDate,
      kind: tourRequests.kind,
      name: tourRequests.name,
      anonymisedAt: tourRequests.anonymisedAt,
      venue: quotes.venue,
    })
    .from(quotes)
    .leftJoin(tourRequests, eq(quotes.tourRequestId, tourRequests.id))
    .where(
      and(
        inArray(quotes.status, [...QUOTE_HOLDING_STATUSES]),
        sql`${quotes.eventDate} between ${from} and ${to}`,
        isEventQuoteSql(),
      ),
    )
    .orderBy(asc(quotes.eventDate), asc(quotes.createdAt));

  return rows.map(({ anonymisedAt, ...row }) => ({
    ...row,
    // An anonymised enquiry keeps its row and loses the person.
    name: anonymisedAt ? null : row.name,
  }));
}

// ---------------------------------------------------------------------------
// Tour quotes — the departure, or one car, not the day
// ---------------------------------------------------------------------------

/**
 * One paid tour quote and what it holds (`lib/tour-quote.ts`): its whole
 * departure, or one driver and one car when the team picked the car.
 *
 * The same statuses hold as for an event: a tour quote is paid in one go, so
 * it reaches `paid` on its one payment, and a refund does not free the car
 * until somebody cancels the quote — the event rule, kept for the same reason.
 * The name is the lead's, for the Calendar's day sheet, and null once erased.
 */
export type TourQuoteHold = TourHold & {
  quoteId: string;
  tourRequestId: string | null;
  date: DateKey;
  name: string | null;
};

/** The paid tour quotes between two day keys, in date order. */
export async function tourQuoteHoldsBetween(options: {
  from: DateKey;
  to: DateKey;
}): Promise<TourQuoteHold[]> {
  const { from, to } = options;
  const rows = await db
    .select({
      quoteId: quotes.id,
      tourRequestId: quotes.tourRequestId,
      date: quotes.eventDate,
      kind: quotes.kind,
      holdSlot: quotes.holdSlot,
      holdVehicleClass: quotes.holdVehicleClass,
      name: tourRequests.name,
      anonymisedAt: tourRequests.anonymisedAt,
    })
    .from(quotes)
    .leftJoin(tourRequests, eq(quotes.tourRequestId, tourRequests.id))
    .where(
      and(
        inArray(quotes.status, [...QUOTE_HOLDING_STATUSES]),
        sql`${quotes.eventDate} between ${from} and ${to}`,
        isTourQuoteSql(),
      ),
    )
    .orderBy(asc(quotes.eventDate), asc(quotes.createdAt));

  return rows.flatMap((row) => {
    const hold = tourHoldOf(row);
    if (!hold) return [];
    return [
      {
        ...hold,
        quoteId: row.quoteId,
        tourRequestId: row.tourRequestId,
        date: row.date,
        name: row.anonymisedAt ? null : row.name,
      },
    ];
  });
}

/**
 * The tour-quote holds that take one car, as occupancy groups — one private
 * car per held departure — so `tallyOccupancy` counts them exactly as it
 * counts a booking: one driver, one car of the class, and no open seats for
 * anybody to join. A hold with no car is not a group: it takes the whole
 * departure ({@link applyDepartureHolds}).
 */
export function tourHoldGroups(
  holds: readonly Pick<TourQuoteHold, "date" | "slot" | "vehicleClass">[],
): OccupancyGroup[] {
  return holds.flatMap((hold) => {
    const { vehicleClass } = hold;
    if (vehicleClass === null) return [];
    return heldDepartures(hold.slot).map((slot) => ({
      date: hold.date,
      slot,
      vehicleClass,
      sharedCarId: null,
      // Read only for an open car, which this never is.
      experienceSlug: "",
      bookings: 1,
      seats: 0,
    }));
  });
}

/**
 * Fold the tour quotes that hold a whole departure into an occupancy map, in
 * place, and return it.
 *
 * Each held departure gains the quote in `tourHolds`, creating the entry when
 * no booking made one. The other departure of the day is not touched. Driver
 * and car counts are left alone, as for an event hold: they are bookings, and
 * the day sheet still says how many tours are already on the departure. What
 * makes the departure unsellable is the hold itself, read by `describeSlot`.
 * A hold with a car is skipped: {@link tourHoldGroups} counts it.
 */
export function applyDepartureHolds(
  occupancy: Map<string, SlotOccupancy>,
  holds: readonly Pick<TourQuoteHold, "date" | "slot" | "vehicleClass" | "quoteId">[],
): Map<string, SlotOccupancy> {
  for (const hold of holds) {
    if (hold.vehicleClass !== null) continue;
    for (const slot of heldDepartures(hold.slot)) {
      const key = `${hold.date}#${slot}`;
      const entry = occupancy.get(key) ?? { drivers: 0, vehicles: noVehicles() };
      const held = entry.tourHolds ?? [];
      if (!held.includes(hold.quoteId)) {
        entry.tourHolds = [...held, hold.quoteId];
      }
      occupancy.set(key, entry);
    }
  }
  return occupancy;
}

/**
 * One departure's occupancy as it would be if this quote held nothing.
 *
 * The question behind the team's two buttons on a paid tour quote: "is this
 * car free for the group?" must not count what the group's own quote holds —
 * the whole departure, or the one car it has now. Pure, and it returns a copy.
 */
export function withoutTourHold(
  occupancy: SlotOccupancy,
  hold: { quoteId: string; vehicleClass: TourHold["vehicleClass"] },
): SlotOccupancy {
  const vehicles = { ...occupancy.vehicles };
  let drivers = occupancy.drivers;
  if (hold.vehicleClass !== null) {
    drivers = Math.max(0, drivers - 1);
    vehicles[hold.vehicleClass] = Math.max(0, vehicles[hold.vehicleClass] - 1);
  }
  return {
    ...occupancy,
    drivers,
    vehicles,
    tourHolds: (occupancy.tourHolds ?? []).filter((id) => id !== hold.quoteId),
  };
}
