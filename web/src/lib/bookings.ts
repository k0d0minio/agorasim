/**
 * Bookings: what a tour costs, and how many seats are gone.
 *
 * Two jobs, one module, for the same reason `lib/availability.ts` keeps its
 * arithmetic next to its queries — the seat count *is* the demand side of the
 * calendar, and separating "what we sold" from "how much of the day is left"
 * would put a file boundary through one idea.
 *
 * **Money is integer cents, everywhere.** Floats are a rounding error looking
 * for a customer to find them, and cents are what Stripe charges in, so the
 * only conversion is at the display edge ({@link formatPrice}).
 *
 * **The price is never read off a form.** {@link quote} computes it from the
 * catalogue rows on the server; the browser is told the total so it can show
 * it, and told again by Stripe, and neither telling is trusted. An unpriced
 * experience is unsellable rather than free — see {@link quote}'s failure
 * cases.
 *
 * Server-only: it imports `@/db`. The pure half is unit-tested through the
 * `server-only` stub, as elsewhere in this repo.
 */
import "server-only";

import { and, count, eq, gt, inArray, lt, or, sql } from "drizzle-orm";

import {
  bookings,
  db,
  type Booking,
  type BookingLineItem,
  type BookingStatus,
  type AvailabilitySlot,
} from "@/db";
import type { Experience } from "@/content/experiences";
import { DEFAULT_SLOT, type DateKey } from "@/lib/availability";

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

/** The currency the business sells in. Stripe wants it lowercase. */
export const BOOKING_CURRENCY = "eur";

/** The reference a booking wears: short, stable, greppable — like `enquiryRef`. */
export function bookingRef(id: string): string {
  return `BK-${id.slice(0, 6).toUpperCase()}`;
}

/** When a hold started now would lapse. */
export function holdExpiryFrom(now: Date = new Date()): Date {
  return new Date(now.getTime() + BOOKING_HOLD_MINUTES * 60_000);
}

// ---------------------------------------------------------------------------
// Pricing
// ---------------------------------------------------------------------------

/** A priced quote for a party — what the guest is about to be charged. */
export type Quote = {
  items: BookingLineItem[];
  totalCents: number;
  currency: string;
  partySize: number;
};

/** Why a basket could not be priced. Each one is a different thing to say. */
export type QuoteFailure =
  | { ok: false; reason: "unknown-experience"; slug: string }
  | { ok: false; reason: "unpriced"; slug: string }
  | { ok: false; reason: "bad-party-size" };

/**
 * Price a basket from the catalogue.
 *
 * Everything is **per person**, tour and add-ons alike, which is how the offer
 * has always been described. Two guests taking the Manzwine stop pay for two
 * tastings.
 *
 * The failure cases are the interesting part:
 *
 * - `unknown-experience` — a slug that is not in the catalogue. Refused, not
 *   dropped: dropping it would charge for a smaller day than the guest chose.
 *   (The enquiry form *does* drop unknown slugs, because an enquiry is not a
 *   contract. This is.)
 * - `unpriced` — the entry exists and has no price. **Not free.** Until Diogo &
 *   Rita set real prices (AGORA-002) this is the state everything is in, and
 *   selling a €0 tour would be a worse outcome than not selling one.
 * - `bad-party-size` — zero or negative people.
 */
export function quote(options: {
  experience: Experience | undefined;
  addOns: (Experience | undefined)[];
  partySize: number;
  /** Slugs as submitted, so a rejection can name the one that failed. */
  requested?: { experience: string; addOns: string[] };
}): ({ ok: true } & Quote) | QuoteFailure {
  const { experience, addOns, partySize, requested } = options;

  if (!Number.isInteger(partySize) || partySize < 1) {
    return { ok: false, reason: "bad-party-size" };
  }
  if (!experience) {
    return {
      ok: false,
      reason: "unknown-experience",
      slug: requested?.experience ?? "",
    };
  }

  const items: BookingLineItem[] = [];

  for (const [index, entry] of [experience, ...addOns].entries()) {
    const slug =
      entry?.slug ??
      (index === 0 ? requested?.experience : requested?.addOns[index - 1]) ??
      "";

    if (!entry) return { ok: false, reason: "unknown-experience", slug };

    const unitCents = entry.priceCents;
    if (typeof unitCents !== "number" || unitCents <= 0) {
      return { ok: false, reason: "unpriced", slug: entry.slug };
    }

    items.push({
      slug: entry.slug,
      kind: entry.kind,
      unitCents,
      quantity: partySize,
    });
  }

  return {
    ok: true,
    items,
    totalCents: items.reduce((sum, item) => sum + item.unitCents * item.quantity, 0),
    currency: BOOKING_CURRENCY,
    partySize,
  };
}

/** Whether an experience can be sold at all right now. */
export function isSellable(entry: Experience | undefined): boolean {
  return typeof entry?.priceCents === "number" && entry.priceCents > 0;
}

/**
 * A price as an operator types it → cents. `""` (and anything unreadable)
 * means "no price", which is not the same as zero.
 *
 * Accepts a comma or a dot for the decimal separator, because the people
 * filling this in write "145,50" and their phone keyboard offers whichever it
 * feels like. Rounds to the nearest cent rather than truncating, so a stray
 * third digit costs the guest nothing.
 */
export function parsePriceInput(value: string): number | null {
  const cleaned = value.trim().replace(/\s/g, "").replace(",", ".");
  if (!cleaned) return null;
  if (!/^\d+(\.\d{1,3})?$/.test(cleaned)) return null;

  const cents = Math.round(Number(cleaned) * 100);
  return Number.isFinite(cents) && cents > 0 ? cents : null;
}

/** Cents → the string the price field is pre-filled with ("145" / "145.50"). */
export function priceInputValue(cents: number | null | undefined): string {
  if (typeof cents !== "number" || cents <= 0) return "";
  return cents % 100 === 0 ? String(cents / 100) : (cents / 100).toFixed(2);
}

/** `14500` → "€145" / "€145,50" — trailing cents only when there are any. */
export function formatPrice(
  cents: number,
  locale: "pt" | "en",
  currency: string = BOOKING_CURRENCY,
): string {
  return new Intl.NumberFormat(locale === "pt" ? "pt-PT" : "en-GB", {
    style: "currency",
    currency: currency.toUpperCase(),
    // A tour priced in whole euros should read "€145", not "€145.00"; one
    // priced at €145.50 must not silently round to €146.
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

// ---------------------------------------------------------------------------
// Seats
// ---------------------------------------------------------------------------

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

/**
 * Seats taken, per day, between two dates.
 *
 * The map is what both calendars pass to `describeMonth` as `bookedByDate`; a
 * day missing from it has nothing sold against it.
 */
export async function countBookedSeats(options: {
  from: DateKey;
  to: DateKey;
  slot?: AvailabilitySlot;
  now?: Date;
}): Promise<Map<DateKey, number>> {
  const { from, to, slot = DEFAULT_SLOT, now = new Date() } = options;

  const rows = await db
    .select({
      date: bookings.date,
      seats: sql<number>`coalesce(sum(${bookings.partySize}), 0)::int`,
    })
    .from(bookings)
    .where(
      and(
        eq(bookings.slot, slot),
        sql`${bookings.date} between ${from} and ${to}`,
        // The seat-occupancy rule, in SQL. Keep it in step with
        // `occupiesSeat` — they are the same sentence twice.
        or(
          eq(bookings.status, "confirmed"),
          and(eq(bookings.status, "pending"), gt(bookings.holdExpiresAt, now)),
        ),
      ),
    )
    .groupBy(bookings.date);

  return new Map(rows.map((row) => [row.date, row.seats]));
}

/**
 * Seats taken on one day — the number the checkout re-checks against, in the
 * same statement shape as the bulk count above.
 */
export async function countBookedSeatsOn(
  date: DateKey,
  slot: AvailabilitySlot = DEFAULT_SLOT,
  now: Date = new Date(),
): Promise<number> {
  return (await countBookedSeats({ from: date, to: date, slot, now })).get(date) ?? 0;
}

/**
 * Whether any live booking exists on these days.
 *
 * The guard the admin calendar needs before clearing days: a day nobody has
 * decided about and a day somebody has paid for look identical in the
 * `availability` table, and only one of them is safe to forget.
 */
export async function datesWithBookings(
  dates: DateKey[],
  slot: AvailabilitySlot = DEFAULT_SLOT,
  now: Date = new Date(),
): Promise<Set<DateKey>> {
  if (dates.length === 0) return new Set();

  const rows = await db
    .select({ date: bookings.date, n: count() })
    .from(bookings)
    .where(
      and(
        inArray(bookings.date, dates),
        eq(bookings.slot, slot),
        or(
          eq(bookings.status, "confirmed"),
          and(eq(bookings.status, "pending"), gt(bookings.holdExpiresAt, now)),
        ),
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
