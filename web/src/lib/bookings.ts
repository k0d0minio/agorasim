/**
 * Bookings: how many seats are gone, and who owns a slot.
 *
 * The *price* of a booking lives in `lib/pricing.ts`, which is pure and shared
 * with the browser. What lives here is demand: the seat counts and exclusive
 * holds the calendar's arithmetic runs on, next to the queries they are
 * arithmetic about — the same reason `lib/availability.ts` keeps its grid
 * logic next to its rows.
 *
 * **Occupancy is two numbers.** A public booking consumes seats; a private
 * booking owns whatever was left of its slot (`exclusive`), and while a live
 * one exists the slot answers "sold out" no matter what the seat arithmetic
 * says. Both live in {@link SlotOccupancy}, and every count here reports both.
 *
 * Server-only: it imports `@/db`. The pure half is unit-tested through the
 * `server-only` stub, as elsewhere in this repo.
 */
import "server-only";

import { and, count, eq, gt, inArray, lt, or, sql } from "drizzle-orm";

import {
  bookings,
  db,
  type AvailabilitySlot,
  type Booking,
  type BookingStatus,
} from "@/db";
import type { DateKey } from "@/lib/availability";

/**
 * How long a seat is held while the guest is on Stripe's payment page.
 *
 * Thirty minutes is not arbitrary: it is the shortest expiry a Stripe Checkout
 * Session accepts, so the hold and the session can be given the same deadline
 * and cannot disagree about whether a payment is still possible. Long enough to
 * find a card; short enough that an abandoned checkout does not sit on the last
 * seat of a Saturday in August for an afternoon.
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
// Seats
// ---------------------------------------------------------------------------

/**
 * What one (tour, day, slot) has sold: seats gone, and whether a live private
 * booking owns the slot outright.
 */
export type SlotOccupancy = {
  seats: number;
  exclusive: boolean;
};

/**
 * The statuses that occupy a seat.
 *
 * `confirmed` obviously. `pending` only while its hold is live — which is a
 * predicate on the clock, not on the status, so this list alone is not the
 * whole condition. See {@link occupiesSeat}.
 */
export const SEAT_HOLDING_STATUSES: BookingStatus[] = ["pending", "confirmed"];

/**
 * Whether one booking is currently taking up room.
 *
 * The pure statement of the rule the SQL below implements, so the two can be
 * compared by eye and the interesting case — a pending booking whose hold has
 * lapsed — can be tested without a database.
 */
export function occupiesSeat(
  booking: Pick<Booking, "status" | "holdExpiresAt">,
  now: Date = new Date(),
): boolean {
  if (booking.status === "confirmed") return true;
  if (booking.status !== "pending") return false;
  // An abandoned checkout releases its seat by the clock. Nothing has to run
  // for this to be true — which is the point: a sweeper that fails silently
  // would leave August looking sold out.
  return booking.holdExpiresAt.getTime() > now.getTime();
}

/** The seat-occupancy rule, in SQL. Keep in step with {@link occupiesSeat}. */
function occupiesSeatSql(now: Date) {
  return or(
    eq(bookings.status, "confirmed"),
    and(eq(bookings.status, "pending"), gt(bookings.holdExpiresAt, now)),
  );
}

/**
 * Occupancy for one tour, per (day, slot), between two dates.
 *
 * The map is what the calendars pass to `describeMonth` as `occupancy`, keyed
 * with `occupancySlotKey` from `lib/availability.ts`; a slot missing from it
 * has nothing sold against it.
 */
export async function countSlotOccupancy(options: {
  experienceSlug: string;
  from: DateKey;
  to: DateKey;
  now?: Date;
}): Promise<Map<string, SlotOccupancy>> {
  const { experienceSlug, from, to, now = new Date() } = options;

  const rows = await db
    .select({
      date: bookings.date,
      slot: bookings.slot,
      seats: sql<number>`coalesce(sum(${bookings.partySize}), 0)::int`,
      exclusive: sql<boolean>`bool_or(${bookings.exclusive})`,
    })
    .from(bookings)
    .where(
      and(
        eq(bookings.experienceSlug, experienceSlug),
        sql`${bookings.date} between ${from} and ${to}`,
        occupiesSeatSql(now),
      ),
    )
    .groupBy(bookings.date, bookings.slot);

  return new Map(
    rows.map((row) => [
      `${row.date}#${row.slot}`,
      { seats: row.seats, exclusive: row.exclusive },
    ]),
  );
}

/**
 * Occupancy of one departure — what the checkout re-checks against, in the
 * same statement shape as the bulk count above.
 */
export async function slotOccupancyOn(
  experienceSlug: string,
  date: DateKey,
  slot: AvailabilitySlot,
  now: Date = new Date(),
): Promise<SlotOccupancy> {
  const map = await countSlotOccupancy({ experienceSlug, from: date, to: date, now });
  return map.get(`${date}#${slot}`) ?? { seats: 0, exclusive: false };
}

/**
 * Whether any live booking exists on these departures of this tour.
 *
 * The guard the admin calendar needs before clearing days: a day nobody has
 * decided about and a day somebody has paid for look identical in the
 * `availability` table, and only one of them is safe to forget.
 */
export async function datesWithBookings(options: {
  experienceSlug: string;
  dates: DateKey[];
  slots: AvailabilitySlot[];
  now?: Date;
}): Promise<Set<DateKey>> {
  const { experienceSlug, dates, slots, now = new Date() } = options;
  if (dates.length === 0 || slots.length === 0) return new Set();

  const rows = await db
    .select({ date: bookings.date, n: count() })
    .from(bookings)
    .where(
      and(
        eq(bookings.experienceSlug, experienceSlug),
        inArray(bookings.date, dates),
        inArray(bookings.slot, slots),
        occupiesSeatSql(now),
      ),
    )
    .groupBy(bookings.date);

  return new Set(rows.filter((row) => row.n > 0).map((row) => row.date));
}

/**
 * Mark lapsed holds as `expired`.
 *
 * **Cosmetics, not correctness.** The seat is already free — `occupiesSeat` and
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
