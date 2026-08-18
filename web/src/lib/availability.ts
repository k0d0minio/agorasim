/**
 * The bookable calendar.
 *
 * One module for both halves of availability, because they are one idea and
 * splitting them would put the arithmetic on one side of a file boundary from
 * the rows it is arithmetic *about*:
 *
 * - the **pure** half — date keys, month grids, and the rule that decides
 *   whether a given departure can be sold — which is unit-tested directly;
 * - the **reads and writes** against the `availability` table, which are typed
 *   and covered by the build, like every other database access in this repo.
 *
 * **The calendar is per tour, per day, per departure.** Diogo & Rita run two
 * departures a day (10:00 and 14:00) on two different tours, and opening a
 * Saturday morning for Rural Saloia says nothing about Óbidos or about the
 * afternoon. Every read and write names its `experienceSlug`, and a row is one
 * (tour, day, slot).
 *
 * **A private booking owns its slot.** Occupancy is therefore two numbers, not
 * one: seats sold, and whether a live exclusive hold exists — see
 * `SlotOccupancy` in `lib/bookings.ts`, which this module consumes but never
 * computes.
 *
 * **Dates are `YYYY-MM-DD` strings, everywhere.** A tour on the 15th of August
 * happens on the 15th of August in Sintra, and the moment that becomes a
 * `Date` it acquires a timezone and starts being the 14th for somebody. The
 * conversion happens at the two edges — {@link dateKey} coming in, the SQL
 * `date` column going out — and nothing in between holds an instant.
 *
 * **Absence is a no.** A slot with no row is not bookable. See the note on the
 * table in `db/schema.ts` for why the default has to be that way round.
 *
 * Server-only: it imports `@/db`. The pure functions are importable in tests
 * through the `server-only` stub, the same way `lib/sales.ts` is.
 */
import "server-only";

import { and, asc, between, eq, inArray } from "drizzle-orm";

import {
  availability,
  db,
  type AvailabilityRow,
  type AvailabilitySlot,
  type AvailabilityStatus,
} from "@/db";
import type { SlotOccupancy } from "@/lib/bookings";

/**
 * The two departures the business actually runs — 10:00 and 14:00, from Diogo
 * & Rita's capacity answers. `full_day` still exists in the enum (Postgres
 * cannot drop a value) but nothing offers or writes it since the 0012
 * migration moved its rows to `morning`.
 */
export const TOUR_SLOTS = ["morning", "afternoon"] as const;

export function isTourSlot(value: unknown): value is (typeof TOUR_SLOTS)[number] {
  return value === "morning" || value === "afternoon";
}

/**
 * Seats a newly-opened slot gets, per tour.
 *
 * Real fleet numbers, not guesses: the countryside tour can combine the cars
 * for 14 guests (their stated maximum); Óbidos is capped at the 12 its price
 * table goes to. Rita can lower either from the calendar, day by day.
 */
const DEFAULT_CAPACITIES: Record<string, number> = {
  "rural-saloia": 14,
  "obidos-medieval-villages": 12,
};

/** The fallback for a tour the map does not name. */
export const DEFAULT_CAPACITY = 12;

export function defaultCapacityFor(experienceSlug: string): number {
  return DEFAULT_CAPACITIES[experienceSlug] ?? DEFAULT_CAPACITY;
}

/**
 * The most seats a single slot can be given.
 *
 * A stop, not a policy: the stepper's buttons are the real limit, and this is
 * what keeps a hand-crafted form from opening a day for four hundred guests.
 * The full fleet plus generous room to grow.
 */
export const MAX_CAPACITY = 24;

/**
 * How far ahead the calendar can be opened or browsed, in months.
 *
 * Not a policy about how far ahead guests may book — that is the team's, and
 * they express it by opening days. It is a bound on the month pager so a
 * mis-tap cannot walk to the year 3000, and on the range a public read will
 * scan.
 */
export const CALENDAR_HORIZON_MONTHS = 18;

// ---------------------------------------------------------------------------
// Date keys
// ---------------------------------------------------------------------------

/** `2026-08-15` — the only date format this engine passes around. */
export type DateKey = string;

const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Whether a string is a real calendar day in `YYYY-MM-DD` form.
 *
 * Shape *and* existence: `2026-02-31` matches the regex and is not a day, and
 * a booking engine that accepts it will happily sell a tour on it. The
 * round-trip through `Date.UTC` is what rejects it — an overflowing day rolls
 * into the next month and stops matching the string it came from.
 */
export function isDateKey(value: unknown): value is DateKey {
  if (typeof value !== "string" || !DATE_KEY_RE.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

/**
 * The `YYYY-MM-DD` key of a `Date`, read in UTC.
 *
 * UTC rather than local time because the server's timezone is not a fact about
 * the business: the same instant must produce the same key on a laptop in
 * Lisbon and a serverless function in Frankfurt. Callers that mean "today in
 * Portugal" go through {@link todayKey}, which says so.
 */
export function dateKey(date: Date): DateKey {
  return date.toISOString().slice(0, 10);
}

/** The timezone the business, and therefore the calendar, lives in. */
export const BUSINESS_TIME_ZONE = "Europe/Lisbon";

const businessDayFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: BUSINESS_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/**
 * Today, as the business would say it.
 *
 * Portugal is UTC+1 for eight months of the year, so at 00:30 on the 16th in
 * Sintra a UTC clock still says the 15th — and a calendar that greys out
 * yesterday would be offering a tour that already happened. `en-CA` formats as
 * `YYYY-MM-DD`, which is the key format, which is why it is the locale here.
 */
export function todayKey(now: Date = new Date()): DateKey {
  return businessDayFormatter.format(now);
}

/** `2026-08-15` → a UTC midnight `Date`. Invalid keys give `null`. */
export function parseDateKey(key: string): Date | null {
  if (!isDateKey(key)) return null;
  const [year, month, day] = key.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

/** Day of the week for a key, Monday-first: 0 = Monday … 6 = Sunday. */
export function weekdayIndex(key: DateKey): number {
  const date = parseDateKey(key);
  if (!date) return 0;
  // `getUTCDay()` is Sunday-first; the calendar (and Portugal) is not.
  return (date.getUTCDay() + 6) % 7;
}

/** Whether a key falls on a Saturday or Sunday. */
export function isWeekend(key: DateKey): boolean {
  return weekdayIndex(key) >= 5;
}

// ---------------------------------------------------------------------------
// Months
// ---------------------------------------------------------------------------

/** `2026-08` — a month the calendar can be paged to. */
export type MonthKey = string;

const MONTH_KEY_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

export function isMonthKey(value: unknown): value is MonthKey {
  return typeof value === "string" && MONTH_KEY_RE.test(value);
}

/** The month a day belongs to: `2026-08-15` → `2026-08`. */
export function monthOf(key: DateKey): MonthKey {
  return key.slice(0, 7);
}

/** The month `offset` months after `month` (negative goes back). */
export function addMonths(month: MonthKey, offset: number): MonthKey {
  const [year, index] = month.split("-").map(Number);
  // Month 0-based for the arithmetic, so December + 1 rolls the year over.
  const total = year * 12 + (index - 1) + offset;
  const nextYear = Math.floor(total / 12);
  const nextMonth = total - nextYear * 12 + 1;
  return `${String(nextYear).padStart(4, "0")}-${String(nextMonth).padStart(2, "0")}`;
}

/** First and last day of a month, as keys. */
export function monthBounds(month: MonthKey): { first: DateKey; last: DateKey } {
  const [year, index] = month.split("-").map(Number);
  // Day 0 of the *next* month is the last day of this one — no leap-year table.
  const lastDay = new Date(Date.UTC(year, index, 0)).getUTCDate();
  return {
    first: `${month}-01`,
    last: `${month}-${String(lastDay).padStart(2, "0")}`,
  };
}

/**
 * The day keys of a month, in order. The calendar grid's cells, before any
 * leading blanks are added for the first weekday.
 */
export function monthDays(month: MonthKey): DateKey[] {
  const { last } = monthBounds(month);
  const count = Number(last.slice(8));
  return Array.from(
    { length: count },
    (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`,
  );
}

/**
 * A month laid out as a Monday-first grid: `null` for the blank cells before
 * the 1st, then every day key.
 *
 * The grid is what both calendars render — the admin's editor and the public
 * picker — so the "which column does the 1st start in" arithmetic exists once.
 */
export function monthGrid(month: MonthKey): (DateKey | null)[] {
  const days = monthDays(month);
  const lead = weekdayIndex(days[0]);
  return [...Array.from({ length: lead }, () => null), ...days];
}

/** Weekday initials, Monday-first, for the grid header. */
export const WEEKDAY_INITIALS = {
  pt: ["S", "T", "Q", "Q", "S", "S", "D"],
  en: ["M", "T", "W", "T", "F", "S", "S"],
} as const;

/** `2026-08` → "August 2026" / "agosto 2026", in the reader's language. */
export function formatMonth(month: MonthKey, locale: "pt" | "en"): string {
  const [year, index] = month.split("-").map(Number);
  const formatted = new Intl.DateTimeFormat(locale === "pt" ? "pt-PT" : "en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, index - 1, 1)));
  // Portuguese lower-cases month names; as a heading it wants a capital.
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

/** `2026-08-15` → "15 August 2026" / "15 de agosto de 2026". */
export function formatDay(key: DateKey, locale: "pt" | "en"): string {
  const date = parseDateKey(key);
  if (!date) return key;
  return new Intl.DateTimeFormat(locale === "pt" ? "pt-PT" : "en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

/**
 * The months the calendar may be paged to, from `today` out to the horizon.
 * The pager's arrows are disabled at the ends rather than clamped silently.
 */
export function monthWindow(today: DateKey = todayKey()): {
  first: MonthKey;
  last: MonthKey;
} {
  const first = monthOf(today);
  return { first, last: addMonths(first, CALENDAR_HORIZON_MONTHS) };
}

/** Whether `month` is inside the pager's window. */
export function isMonthInWindow(month: MonthKey, today: DateKey = todayKey()): boolean {
  const { first, last } = monthWindow(today);
  return month >= first && month <= last;
}

// ---------------------------------------------------------------------------
// What a departure is, once supply and demand are put together
// ---------------------------------------------------------------------------

/** Occupancy keyed by {@link occupancySlotKey} — how `lib/bookings.ts` reports demand. */
export type OccupancyMap = Map<string, SlotOccupancy>;

/** The key one (day, slot) wears in an {@link OccupancyMap}. */
export function occupancySlotKey(date: DateKey, slot: AvailabilitySlot): string {
  return `${date}#${slot}`;
}

/**
 * One departure of one day, as both the admin editor and the public picker see
 * it. The admin renders every field; the public picker is only ever told what
 * {@link toPublicDay} keeps — never `note`, because why the car is off the
 * road is not the guest's business.
 */
export type AvailabilityDay = {
  date: DateKey;
  /** The stored row's id, when the departure has been opened or closed. */
  id: string | null;
  slot: AvailabilitySlot;
  /** `null` when no row exists — the departure has never been touched. */
  status: AvailabilityStatus | null;
  capacity: number;
  /** Seats already sold into this slot: confirmed bookings plus live holds. */
  booked: number;
  /** Never negative, even if capacity was lowered under a sold seat. */
  seatsLeft: number;
  /** A live private booking owns this slot outright. */
  exclusiveHold: boolean;
  /** In the past, relative to the business's today. */
  past: boolean;
  /** Saturday or Sunday — the admin's "open the weekends" sweep selects on it. */
  weekend: boolean;
  /** Whether a guest can buy seats on this departure right now. */
  bookable: boolean;
  /** Whether a guest can take this departure privately — nothing sold yet. */
  privateBookable: boolean;
  note: string | null;
};

/**
 * Turn one departure's supply and demand into the shape both calendars render.
 *
 * The whole bookability rule lives in this function: the day is not in the
 * past, a row exists and says `open`, no private booking owns the slot, and —
 * for seats — the ones sold have not caught up with capacity, or — for taking
 * it privately — nothing has been sold at all. Anything that wants to know
 * whether a departure can be sold asks this — the public page, the checkout
 * action that re-checks it server-side, and the admin, which is how the three
 * cannot quietly disagree.
 */
export function describeDay(options: {
  date: DateKey;
  slot: AvailabilitySlot;
  row?: Pick<AvailabilityRow, "id" | "slot" | "status" | "capacity" | "note"> | null;
  occupancy?: SlotOccupancy;
  today?: DateKey;
}): AvailabilityDay {
  const { date, slot, row, today = todayKey() } = options;
  const occupancy = options.occupancy ?? { seats: 0, exclusive: false };

  const capacity = row?.capacity ?? 0;
  // `max(0, …)`: capacity can be lowered below what is already sold, and a
  // negative "seats left" would render as an offer to un-sell one.
  const seatsLeft = Math.max(0, capacity - occupancy.seats);
  const past = date < today;
  const open = !past && row?.status === "open" && !occupancy.exclusive;

  return {
    date,
    id: row?.id ?? null,
    slot,
    status: row?.status ?? null,
    capacity,
    booked: occupancy.seats,
    seatsLeft,
    exclusiveHold: occupancy.exclusive,
    past,
    weekend: isWeekend(date),
    bookable: open && seatsLeft > 0,
    privateBookable: open && occupancy.seats === 0 && capacity > 0,
    note: row?.note ?? null,
  };
}

/**
 * Whether a party of `seats` fits into a departure, the way it wants to come.
 *
 * Separate from `bookable` because they answer different questions: the
 * calendar greys out departures nobody can book, and this refuses the specific
 * booking in front of it. A slot with one seat left is bookable and is still a
 * "no" to a family of four; a slot with two seats sold is bookable and still a
 * "no" to a group that wants it privately.
 */
export function fitsParty(
  day: AvailabilityDay,
  seats: number,
  mode: "public" | "private" = "public",
): boolean {
  if (seats < 1) return false;
  if (mode === "private") return day.privateBookable && seats <= day.capacity;
  return day.bookable && seats <= day.seatsLeft;
}

/** One day of the grid: every departure of that day, in {@link TOUR_SLOTS} order. */
export type DaySlots = {
  date: DateKey;
  slots: AvailabilityDay[];
};

/**
 * A month of {@link DaySlots} — every day of the month, whether or not it has
 * rows. The grid needs a cell for the 3rd even when nobody has ever opened
 * the 3rd, and each cell carries both departures.
 */
export function describeMonth(options: {
  month: MonthKey;
  rows: AvailabilityRow[];
  occupancy?: OccupancyMap;
  today?: DateKey;
}): DaySlots[] {
  const { month, rows, occupancy, today = todayKey() } = options;
  const byKey = new Map(rows.map((row) => [occupancySlotKey(row.date, row.slot), row]));

  return monthDays(month).map((date) => ({
    date,
    slots: TOUR_SLOTS.map((slot) =>
      describeDay({
        date,
        slot,
        row: byKey.get(occupancySlotKey(date, slot)) ?? null,
        occupancy: occupancy?.get(occupancySlotKey(date, slot)),
        today,
      }),
    ),
  }));
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

/** The stored rows for one tour between two day keys, inclusive, in date order. */
export async function listAvailabilityRows(
  experienceSlug: string,
  from: DateKey,
  to: DateKey,
): Promise<AvailabilityRow[]> {
  return db
    .select()
    .from(availability)
    .where(
      and(
        eq(availability.experienceSlug, experienceSlug),
        between(availability.date, from, to),
      ),
    )
    .orderBy(asc(availability.date), asc(availability.slot));
}

/** One month of one tour's calendar, ready to render. */
export async function readMonth(options: {
  experienceSlug: string;
  month: MonthKey;
  occupancy?: OccupancyMap;
  today?: DateKey;
}): Promise<DaySlots[]> {
  const { experienceSlug, month, occupancy, today } = options;
  const { first, last } = monthBounds(month);
  const rows = await listAvailabilityRows(experienceSlug, first, last);
  return describeMonth({ month, rows, occupancy, today });
}

/**
 * The stored row for one departure, or `undefined`.
 *
 * Used by the checkout path, which must not trust a date that arrived in a
 * form: the browser was shown a calendar, but what it posts back is whatever
 * the person posting it wants.
 */
export async function readDay(
  experienceSlug: string,
  date: DateKey,
  slot: AvailabilitySlot,
): Promise<AvailabilityRow | undefined> {
  const [row] = await db
    .select()
    .from(availability)
    .where(
      and(
        eq(availability.experienceSlug, experienceSlug),
        eq(availability.date, date),
        eq(availability.slot, slot),
      ),
    )
    .limit(1);
  return row;
}

// ---------------------------------------------------------------------------
// The public calendar
// ---------------------------------------------------------------------------

/**
 * How many months the public picker offers.
 *
 * Not the same number as {@link CALENDAR_HORIZON_MONTHS}, which bounds what the
 * *team* can plan. The public page is statically rendered and ships every month
 * it offers in the payload, so this is a page-weight decision: six months is
 * two seasons of choice at a few kilobytes.
 */
export const PUBLIC_CALENDAR_MONTHS = 6;

/** One departure, as a guest is allowed to see it. */
export type PublicSlot = {
  slot: AvailabilitySlot;
  /** Seats can be bought on it. */
  bookable: boolean;
  /** Only meaningful when `bookable`; 0 otherwise. */
  seatsLeft: number;
  /** It can be taken privately — nothing sold into it yet. */
  privateBookable: boolean;
  /** The most guests a private group could bring to it. */
  capacity: number;
};

/**
 * One day, as a guest is allowed to see it.
 *
 * Deliberately small. The stored rows also carry `note` — "Diogo em
 * casamento", "carro na revisão" — and `status`, which together say rather
 * more about the family's diary than a booking page should. A guest is told a
 * departure is unavailable; they are never told why, and the way to guarantee
 * that is for the reason not to be in the payload at all.
 */
export type PublicDay = {
  date: DateKey;
  /** Any departure of this day is bookable in any way. */
  bookable: boolean;
  slots: PublicSlot[];
};

/** One month of the public picker, ready to render without a round trip. */
export type PublicMonth = {
  month: MonthKey;
  /** Localized heading, e.g. "Agosto de 2026". */
  label: string;
  /** Monday-first grid, `null` for the blanks before the 1st. */
  grid: (DateKey | null)[];
  days: PublicDay[];
  /** Whether anything in this month can actually be booked. */
  hasOpenings: boolean;
};

/** Strip a day down to what a guest may know about it. */
export function toPublicDay(day: DaySlots): PublicDay {
  const slots = day.slots.map((slot) => ({
    slot: slot.slot,
    bookable: slot.bookable,
    seatsLeft: slot.bookable ? slot.seatsLeft : 0,
    privateBookable: slot.privateBookable,
    capacity: slot.privateBookable ? slot.capacity : 0,
  }));
  return {
    date: day.date,
    bookable: slots.some((slot) => slot.bookable || slot.privateBookable),
    slots,
  };
}

/**
 * The months the public picker shows for one tour, from this one forward.
 *
 * **Never throws.** `/reservar` is statically rendered, and CI builds it with
 * no `DATABASE_URL` at all — so an unreachable database returns no months and
 * the page falls back to asking for a date in words, exactly as it did before
 * the calendar existed. The same fallback covers the honest case where nobody
 * has opened a day yet: a booking page with no calendar still has to take
 * leads, or the first week of the season quietly captures nothing.
 *
 * This mirrors the resolver in `lib/experience-catalogue.ts`, for the same
 * reason and with the same warn-once discipline.
 */
export async function readPublicCalendar(options: {
  experienceSlug: string;
  locale: "pt" | "en";
  months?: number;
  occupancy?: OccupancyMap;
  today?: DateKey;
}): Promise<PublicMonth[]> {
  const {
    experienceSlug,
    locale,
    months = PUBLIC_CALENDAR_MONTHS,
    occupancy,
    today = todayKey(),
  } = options;

  const first = monthOf(today);
  const monthKeys = Array.from({ length: months }, (_, i) => addMonths(first, i));

  let rows: AvailabilityRow[];
  try {
    rows = await listAvailabilityRows(
      experienceSlug,
      monthBounds(monthKeys[0]).first,
      monthBounds(monthKeys[monthKeys.length - 1]).last,
    );
  } catch (err) {
    console.warn(
      "[availability] no public calendar — falling back to asking for a date in words: " +
        `${err instanceof Error ? err.message : String(err)}`,
    );
    return [];
  }

  const byMonth = new Map<MonthKey, AvailabilityRow[]>();
  for (const row of rows) {
    const key = monthOf(row.date);
    const bucket = byMonth.get(key);
    if (bucket) bucket.push(row);
    else byMonth.set(key, [row]);
  }

  return monthKeys.map((month) => {
    const days = describeMonth({
      month,
      rows: byMonth.get(month) ?? [],
      occupancy,
      today,
    }).map(toPublicDay);

    return {
      month,
      label: formatMonth(month, locale),
      grid: monthGrid(month),
      days,
      hasOpenings: days.some((day) => day.bookable),
    };
  });
}

/**
 * Re-check one departure, server-side, at the moment of a submission.
 *
 * The browser was shown a calendar; what it posts back is whatever the person
 * posting it wants, and by the time it arrives the slot may have sold out,
 * been taken privately, or been closed anyway. Everything that accepts a date
 * from a guest goes through here.
 *
 * A database failure is a "no". A booking engine that cannot read availability
 * must not fall back to accepting the date; the guest is told to try again,
 * which is true, rather than being sold a day nobody can confirm.
 */
export async function checkSlotAvailable(options: {
  experienceSlug: string;
  date: string;
  slot: AvailabilitySlot;
  seats: number;
  mode: "public" | "private";
  occupancy?: SlotOccupancy;
  today?: DateKey;
}): Promise<
  | { ok: true; day: AvailabilityDay }
  | { ok: false; reason: "invalid" | "unavailable" | "too-many" | "unreadable" }
> {
  const { experienceSlug, date, slot, seats, mode, occupancy, today } = options;

  if (!isDateKey(date) || !isTourSlot(slot)) return { ok: false, reason: "invalid" };

  let row: AvailabilityRow | undefined;
  try {
    row = await readDay(experienceSlug, date, slot);
  } catch (err) {
    console.error("[availability] could not re-check a submitted date", err);
    return { ok: false, reason: "unreadable" };
  }

  const day = describeDay({ date, slot, row, occupancy, today });
  if (!(mode === "private" ? day.privateBookable : day.bookable)) {
    return { ok: false, reason: "unavailable" };
  }
  if (!fitsParty(day, seats, mode)) return { ok: false, reason: "too-many" };

  return { ok: true, day };
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

/**
 * Open, close or adjust a set of departures, in one statement.
 *
 * An upsert rather than a read-then-write: the admin's "open the whole month"
 * button touches sixty departures at once, most of which have no row, and
 * doing that as sixty round trips from a phone on rural 4G is the difference
 * between a tap and a wait. `onConflictDoUpdate` resolves onto
 * `availability_experience_date_slot_key`, which is the index that makes
 * one-row-per-tour-per-day-per-slot true.
 *
 * Returns the rows as they now stand, so the caller can audit what actually
 * changed rather than what it asked for.
 */
export async function upsertDays(options: {
  experienceSlug: string;
  dates: DateKey[];
  slots: AvailabilitySlot[];
  status: AvailabilityStatus;
  capacity?: number;
  note?: string | null;
}): Promise<AvailabilityRow[]> {
  const { experienceSlug, dates, slots, status, note = null } = options;
  const capacity = options.capacity ?? defaultCapacityFor(experienceSlug);
  if (dates.length === 0 || slots.length === 0) return [];

  const now = new Date();

  return db
    .insert(availability)
    .values(
      dates.flatMap((date) =>
        slots.map((slot) => ({ experienceSlug, date, slot, status, capacity, note })),
      ),
    )
    .onConflictDoUpdate({
      target: [availability.experienceSlug, availability.date, availability.slot],
      set: { status, capacity, note, updatedAt: now },
    })
    .returning();
}

/**
 * Remove the rows for `dates` — "I never meant to touch these departures".
 *
 * Distinct from closing them: a closed departure is a decision the calendar
 * records (and can show a note for), an absent one is a decision nobody has
 * made. Deleting is safe for supply, but it is *not* safe for demand, so the
 * caller checks for bookings first — this function only does what it is told.
 */
export async function clearDays(options: {
  experienceSlug: string;
  dates: DateKey[];
  slots: AvailabilitySlot[];
}): Promise<number> {
  const { experienceSlug, dates, slots } = options;
  if (dates.length === 0 || slots.length === 0) return 0;
  const removed = await db
    .delete(availability)
    .where(
      and(
        eq(availability.experienceSlug, experienceSlug),
        inArray(availability.date, dates),
        inArray(availability.slot, slots),
      ),
    )
    .returning({ id: availability.id });
  return removed.length;
}
