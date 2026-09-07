/**
 * Bookings: which drivers and which cars are already committed.
 *
 * The *price* of a booking lives in `lib/pricing.ts`, which is pure and shared
 * with the browser. What lives here is demand: the driver and vehicle counts
 * the calendar's arithmetic runs on, next to the queries they are arithmetic
 * about — the same reason `lib/availability.ts` keeps its grid logic next to
 * its rows.
 *
 * **Occupancy is a pair of pools, counted across every tour.** Since AGORA-012
 * a booking is not a number of seats out of a per-tour capacity; it is one
 * driver and one vehicle of a class (`lib/fleet.ts`) out of the shared pool a
 * departure has. So a Rural Saloia party of two and an Óbidos party of six on
 * the same 10:00 use both drivers between them and nothing else can leave,
 * which is the fact the old model could not express. Both halves live in
 * {@link SlotOccupancy}, and every count here reports both.
 *
 * Server-only: it imports `@/db`. The pure half is unit-tested through the
 * `server-only` stub, as elsewhere in this repo.
 */
import "server-only";

import { and, count, eq, gt, inArray, lt, or, sql } from "drizzle-orm";

import {
  bookings,
  db,
  tourRequests,
  type AvailabilitySlot,
  type Booking,
  type BookingStatus,
} from "@/db";
import { isVehicleClass, noVehicles, type VehicleCounts } from "@/lib/fleet";
import type { DateKey } from "@/lib/availability";

/**
 * How long a car is held while the guest is on Stripe's payment page.
 *
 * Thirty minutes is not arbitrary: it is the shortest expiry a Stripe Checkout
 * Session accepts, so the hold and the session can be given the same deadline
 * and cannot disagree about whether a payment is still possible. Long enough to
 * find a card; short enough that an abandoned checkout does not sit on the last
 * driver of a Saturday in August for an afternoon.
 */
export const BOOKING_HOLD_MINUTES = 30;

/** The reference a booking wears: short, stable, greppable — like `enquiryRef`. */
export function bookingRef(id: string): string {
  return `BK-${id.slice(0, 6).toUpperCase()}`;
}

/** When a hold started now would lapse. */
export function holdExpiryFrom(now: Date = new Date()): Date {
  return new Date(now.getTime() + BOOKING_HOLD_MINUTES * 60_000);
}

// ---------------------------------------------------------------------------
// What a departure has already committed
// ---------------------------------------------------------------------------

/**
 * What one (day, departure) has sold: drivers out, and cars out by class.
 *
 * Both counts are business-wide. The `bookings` rows they come from name a
 * tour, and the count deliberately ignores it: the whole point of AGORA-012 is
 * that a driver taken by Óbidos is a driver Rural Saloia does not have.
 */
export type SlotOccupancy = {
  /** Live bookings on this departure — one driver each. */
  drivers: number;
  /** Vehicles committed, per class. */
  vehicles: VehicleCounts;
};

/** Nothing committed yet. A fresh object: callers add to it. */
export function emptyOccupancy(): SlotOccupancy {
  return { drivers: 0, vehicles: noVehicles() };
}

/**
 * The statuses that hold capacity.
 *
 * `confirmed` obviously. `pending` only while its hold is live — which is a
 * predicate on the clock, not on the status, so this list alone is not the
 * whole condition. See {@link holdsCapacity}.
 */
export const CAPACITY_HOLDING_STATUSES: BookingStatus[] = ["pending", "confirmed"];

/**
 * Whether one booking is currently holding a driver and a car.
 *
 * The pure statement of the rule the SQL below implements, so the two can be
 * compared by eye and the interesting case — a pending booking whose hold has
 * lapsed — can be tested without a database.
 */
export function holdsCapacity(
  booking: Pick<Booking, "status" | "holdExpiresAt">,
  now: Date = new Date(),
): boolean {
  if (booking.status === "confirmed") return true;
  if (booking.status !== "pending") return false;
  // An abandoned checkout releases its car by the clock. Nothing has to run
  // for this to be true — which is the point: a sweeper that fails silently
  // would leave August looking sold out.
  return booking.holdExpiresAt.getTime() > now.getTime();
}

/** The capacity rule, in SQL. Keep in step with {@link holdsCapacity}. */
function holdsCapacitySql(now: Date) {
  return or(
    eq(bookings.status, "confirmed"),
    and(eq(bookings.status, "pending"), gt(bookings.holdExpiresAt, now)),
  );
}

/**
 * Occupancy per (day, departure) between two dates, across every tour.
 *
 * The map is what the calendars pass to `describeMonth` as `occupancy`, keyed
 * with `occupancySlotKey` from `lib/availability.ts`; a departure missing from
 * it has nothing committed against it.
 */
export async function countSlotOccupancy(options: {
  from: DateKey;
  to: DateKey;
  now?: Date;
}): Promise<Map<string, SlotOccupancy>> {
  const { from, to, now = new Date() } = options;

  const rows = await db
    .select({
      date: bookings.date,
      slot: bookings.slot,
      vehicleClass: bookings.vehicleClass,
      // One driver and one car per booking — see the note in `lib/fleet.ts`
      // on why nothing that would need two of either is sellable.
      taken: sql<number>`count(*)::int`,
    })
    .from(bookings)
    .where(
      and(sql`${bookings.date} between ${from} and ${to}`, holdsCapacitySql(now)),
    )
    .groupBy(bookings.date, bookings.slot, bookings.vehicleClass);

  const byKey = new Map<string, SlotOccupancy>();
  for (const row of rows) {
    const key = `${row.date}#${row.slot}`;
    const entry = byKey.get(key) ?? emptyOccupancy();
    entry.drivers += row.taken;
    // A row whose class the fleet no longer knows still took a driver: it is
    // counted against the roster and simply not against any car, which errs
    // towards showing a departure as fuller than the fleet can prove.
    if (isVehicleClass(row.vehicleClass)) {
      entry.vehicles[row.vehicleClass] += row.taken;
    }
    byKey.set(key, entry);
  }
  return byKey;
}

/**
 * One live booking, as the calendar's day sheet lists it.
 *
 * The guest's *name* lives on the lead, never on the booking — the `bookings`
 * row holds only commercial facts (§AGORA), which is why this join goes to
 * `tourRequests` for it and why the name is nullable: a lead erased on request
 * leaves the booking, and the booking must still render, name-less.
 *
 * `ref` is the display reference the guest was quoted (`bookingRef`). It is
 * computed here, server-side, rather than shipped as a client copy of the
 * same string logic.
 */
export type BookingForCalendar = {
  id: string;
  ref: string;
  tourRequestId: string | null;
  name: string | null;
  date: DateKey;
  experienceSlug: string;
  slot: AvailabilitySlot;
  partySize: number;
  status: BookingStatus;
};

/**
 * The live bookings between two dates, newest consideration aside in day and
 * departure order.
 *
 * "Live" is the same predicate the occupancy and the availability calendar run
 * on — {@link holdsCapacitySql}: paid, or pending with a hold that has not
 * lapsed. Anything else is history nobody is due to host, which is why a
 * cancelled seat does not appear on the day sheet beside the guests who are
 * actually coming.
 */
export async function bookingsBetween(options: {
  from: DateKey;
  to: DateKey;
  now?: Date;
}): Promise<BookingForCalendar[]> {
  const { from, to, now = new Date() } = options;

  const rows = await db
    .select({
      id: bookings.id,
      tourRequestId: bookings.tourRequestId,
      name: tourRequests.name,
      date: bookings.date,
      experienceSlug: bookings.experienceSlug,
      slot: bookings.slot,
      partySize: bookings.partySize,
      status: bookings.status,
    })
    .from(bookings)
    .leftJoin(tourRequests, eq(bookings.tourRequestId, tourRequests.id))
    .where(
      and(sql`${bookings.date} between ${from} and ${to}`, holdsCapacitySql(now)),
    )
    .orderBy(bookings.date, bookings.slot);

  return rows.map((row) => ({ ...row, ref: bookingRef(row.id) }));
}

/**
 * Occupancy of one departure — what the checkout re-checks against, in the
 * same statement shape as the bulk count above.
 */
export async function slotOccupancyOn(
  date: DateKey,
  slot: AvailabilitySlot,
  now: Date = new Date(),
): Promise<SlotOccupancy> {
  const map = await countSlotOccupancy({ from: date, to: date, now });
  return map.get(`${date}#${slot}`) ?? emptyOccupancy();
}

/**
 * Whether any live booking exists on these departures — any tour.
 *
 * The guard the admin calendar needs before clearing days: a day nobody has
 * decided about and a day somebody has paid for look identical in the
 * `availability` table, and only one of them is safe to forget.
 */
export async function datesWithBookings(options: {
  dates: DateKey[];
  slots: AvailabilitySlot[];
  now?: Date;
}): Promise<Set<DateKey>> {
  const { dates, slots, now = new Date() } = options;
  if (dates.length === 0 || slots.length === 0) return new Set();

  const rows = await db
    .select({ date: bookings.date, n: count() })
    .from(bookings)
    .where(
      and(
        inArray(bookings.date, dates),
        inArray(bookings.slot, slots),
        holdsCapacitySql(now),
      ),
    )
    .groupBy(bookings.date);

  return new Set(rows.filter((row) => row.n > 0).map((row) => row.date));
}

/**
 * Mark lapsed holds as `expired`.
 *
 * **Cosmetics, not correctness.** The car is already free — `holdsCapacity` and
 * the SQL above both stop counting a pending row the moment its hold passes, so
 * nothing about availability depends on this having run. What it buys is an
 * admin screen that says "expired" instead of "pending" next to a checkout
 * somebody abandoned in March, and a `pending` list that means what it says.
 *
 * Runs from the scheduled retention job, which is weekly — which is fine,
 * precisely because it is cosmetics.
 */
export async function expireLapsedHolds(now: Date = new Date()): Promise<number> {
  const rows = await db
    .update(bookings)
    .set({ status: "expired", updatedAt: now })
    .where(and(eq(bookings.status, "pending"), lt(bookings.holdExpiresAt, now)))
    .returning({ id: bookings.id });

  return rows.length;
}
