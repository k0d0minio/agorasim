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
 * **The calendar is one calendar, per day, per departure.** It used to be per
 * tour, and that was wrong in a way that costs money: Diogo & Rita are two
 * drivers across four cars (info PDF §1.5), so a Rural Saloia booking at 10:00
 * takes a driver the Óbidos tour can no longer use, and two per-tour calendars
 * happily sold the same morning twice. Since AGORA-012 a row is one
 * (day, departure) for the **whole business**, and every tour draws from it.
 *
 * **Capacity is two pools, not a seat count.** A booking consumes one driver
 * and one vehicle of the class its route and party need — see `lib/fleet.ts`,
 * which owns that rule and is shared with the browser. Óbidos draws the
 * touring vehicle and so never depletes the classics; a party of four takes
 * the T3, which means a second party of four in the same departure has nothing
 * to ride in even though a driver is free. Both facts fall out of counting
 * pools instead of seats.
 *
 * **Nobody shares a car.** Every booking is private to its vehicle until
 * AGORA-019 answers whether strangers may ride together. The price list still
 * has shared and private tiers, untouched; what waits is the sharing.
 *
 * **Dates are `YYYY-MM-DD` strings, everywhere.** A tour on the 15th of August
 * happens on the 15th of August in Sintra, and the moment that becomes a
 * `Date` it acquires a timezone and starts being the 14th for somebody. The
 * conversion happens at the two edges — {@link dateKey} coming in, the SQL
 * `date` column going out — and nothing in between holds an instant.
 *
 * **Absence is a no.** A departure with no row is not bookable. See the note on
 * the table in `db/schema.ts` for why the default has to be that way round.
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
import {
  anyVehicleFree,
  assignVehicle,
  DRIVERS_PER_SLOT,
  FLEET_SIZE,
  MAX_DRIVERS_PER_SLOT,
  noVehicles,
  remainingVehicles,
  type VehicleClass,
  type VehicleCounts,
} from "@/lib/fleet";
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
 * Drivers a newly-opened departure gets, and the most it may be given.
 *
 * Re-exported from `lib/fleet.ts` rather than restated, so the calendar, the
 * form schema and the admin stepper all read the roster from the one place
 * that knows what the roster is.
 */
export { DRIVERS_PER_SLOT as DEFAULT_DRIVERS, MAX_DRIVERS_PER_SLOT as MAX_DRIVERS };

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

/** The key one (day, departure) wears in an {@link OccupancyMap}. */
export function occupancySlotKey(date: DateKey, slot: AvailabilitySlot): string {
  return `${date}#${slot}`;
}

/** Nothing sold into a departure yet. */
function noOccupancy(): SlotOccupancy {
  return { drivers: 0, vehicles: noVehicles() };
}

/**
 * One departure of one day, as both the admin editor and the public picker see
 * it. The admin renders every field; the public picker is only ever told what
 * {@link toPublicDay} keeps — never `note`, because why the car is off the
 * road is not the guest's business.
 */
export type SlotAvailability = {
  date: DateKey;
  /** The stored row's id, when the departure has been opened or closed. */
  id: string | null;
  slot: AvailabilitySlot;
  /** `null` when no row exists — the departure has never been touched. */
  status: AvailabilityStatus | null;
  /** Drivers rostered on this departure. 0 when there is no row. */
  drivers: number;
  /** Drivers already out on a tour — one per live booking, any route. */
  driversUsed: number;
  /** Never negative, even if the roster was cut under a paid booking. */
  driversLeft: number;
  /** The fleet, per class — the denominator, the same every day. */
  vehicles: VehicleCounts;
  /** Cars already committed on this departure, per class, across every route. */
  vehiclesUsed: VehicleCounts;
  /** What is still free to sell, per class. */
  vehiclesLeft: VehicleCounts;
  /** In the past, relative to the business's today. */
  past: boolean;
  /** Saturday or Sunday — the admin's "open the weekends" sweep selects on it. */
  weekend: boolean;
  /** The team has put this departure on sale and it has not happened yet. */
  onSale: boolean;
  /**
   * A deposit-paid wedding or event holds this whole day (`lib/event-holds.ts`).
   * Admin-only, like `note`: {@link toPublicDay} never carries it, and a guest
   * is told the departure is unavailable, not why.
   */
  heldByEvent: boolean;
  /** Whether *some* party could still be sold this departure. */
  bookable: boolean;
  note: string | null;
};

/**
 * Turn one departure's supply and demand into the shape both calendars render.
 *
 * The whole bookability rule lives in this function: the day is not in the
 * past, a row exists and says `open`, no paid event holds the day, a driver is
 * still free, and some vehicle is still free. Which vehicle *this* party needs is a different question —
 * {@link fitsParty} — because a departure with only the T3 left is bookable
 * and is still a no to a couple who would take a 2CV somebody else already has.
 *
 * Anything that wants to know whether a departure can be sold asks this: the
 * public page, the checkout action that re-checks it server-side, and the
 * admin, which is how the three cannot quietly disagree.
 */
export function describeSlot(options: {
  date: DateKey;
  slot: AvailabilitySlot;
  row?: Pick<AvailabilityRow, "id" | "slot" | "status" | "drivers" | "note"> | null;
  occupancy?: SlotOccupancy;
  today?: DateKey;
}): SlotAvailability {
  const { date, slot, row, today = todayKey() } = options;
  const occupancy = options.occupancy ?? noOccupancy();

  const drivers = row?.drivers ?? 0;
  // A held day has nothing left to sell, whatever the bookings on it say: the
  // drivers and the cars are at the event. Zeroed here rather than only in
  // `bookable`, so every sum over "what is left" agrees with the refusal.
  const heldByEvent = (occupancy.eventHolds?.length ?? 0) > 0;
  // `max(0, …)`: the roster can be cut below what is already out, and a
  // negative "drivers left" would render as an offer to un-sell a tour.
  const driversLeft = heldByEvent ? 0 : Math.max(0, drivers - occupancy.drivers);
  const vehiclesLeft = heldByEvent
    ? noVehicles()
    : remainingVehicles(FLEET_SIZE, occupancy.vehicles);
  const past = date < today;
  const onSale = !past && row?.status === "open";

  return {
    date,
    id: row?.id ?? null,
    slot,
    status: row?.status ?? null,
    drivers,
    driversUsed: occupancy.drivers,
    driversLeft,
    vehicles: FLEET_SIZE,
    vehiclesUsed: occupancy.vehicles,
    vehiclesLeft,
    past,
    weekend: isWeekend(date),
    onSale,
    heldByEvent,
    bookable: onSale && !heldByEvent && driversLeft > 0 && anyVehicleFree(vehiclesLeft),
    note: row?.note ?? null,
  };
}

/**
 * Whether a particular party, on a particular route, fits a departure — and if
 * not, which of the several different noes it is.
 *
 * Each reason is a different sentence to the guest, which is why this returns
 * one rather than a boolean: "that departure is closed", "the car for a group
 * your size is already out", and "groups above eight are a phone call" are
 * three quite different things to be told, and collapsing them into "no" is
 * how a booking page loses a booking it could have taken.
 */
export type PartyFit =
  | { ok: true; vehicleClass: VehicleClass }
  | {
      ok: false;
      reason: "bad-party" | "unavailable" | "no-driver" | "no-vehicle" | "party-too-large";
    };

export function fitsParty(
  slot: SlotAvailability,
  experienceSlug: string,
  partySize: number,
): PartyFit {
  const assignment = assignVehicle(experienceSlug, partySize);
  if (!assignment.ok) {
    return {
      ok: false,
      reason: assignment.reason === "empty-party" ? "bad-party" : "party-too-large",
    };
  }
  // A held day is closed to every party, not "full": there is no car to wait for.
  if (!slot.onSale || slot.heldByEvent) return { ok: false, reason: "unavailable" };
  if (slot.driversLeft < 1) return { ok: false, reason: "no-driver" };
  if (slot.vehiclesLeft[assignment.vehicleClass] < 1) {
    return { ok: false, reason: "no-vehicle" };
  }
  return { ok: true, vehicleClass: assignment.vehicleClass };
}

/** One day of the grid: every departure of that day, in {@link TOUR_SLOTS} order. */
export type DaySlots = {
  date: DateKey;
  slots: SlotAvailability[];
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
      describeSlot({
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

/** The stored rows between two day keys, inclusive, in date order. */
export async function listAvailabilityRows(
  from: DateKey,
  to: DateKey,
): Promise<AvailabilityRow[]> {
  return db
    .select()
    .from(availability)
    .where(between(availability.date, from, to))
    .orderBy(asc(availability.date), asc(availability.slot));
}

/** One month of the calendar, ready to render. */
export async function readMonth(options: {
  month: MonthKey;
  occupancy?: OccupancyMap;
  today?: DateKey;
}): Promise<DaySlots[]> {
  const { month, occupancy, today } = options;
  const { first, last } = monthBounds(month);
  const rows = await listAvailabilityRows(first, last);
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
  date: DateKey,
  slot: AvailabilitySlot,
): Promise<AvailabilityRow | undefined> {
  const [row] = await db
    .select()
    .from(availability)
    .where(and(eq(availability.date, date), eq(availability.slot, slot)))
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

/**
 * One departure, as a guest is allowed to see it.
 *
 * Two numbers, because the browser has to answer a question that depends on
 * the party in front of it: a departure is available to *these four people on
 * this route* if a driver is free and the class of car they need is free. The
 * same `slotFitsParty` the server decides with runs over exactly these fields,
 * so the grid greys out precisely what the checkout would refuse.
 */
export type PublicSlot = {
  slot: AvailabilitySlot;
  /** Tours that could still leave on this departure. 0 when it is off sale. */
  driversLeft: number;
  /** Cars still free, per class. All zero when the departure is off sale. */
  vehiclesLeft: VehicleCounts;
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
  /** Some party could be sold some departure of this day. */
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
    driversLeft: slot.bookable ? slot.driversLeft : 0,
    vehiclesLeft: slot.bookable ? slot.vehiclesLeft : noVehicles(),
  }));
  return {
    date: day.date,
    bookable: day.slots.some((slot) => slot.bookable),
    slots,
  };
}

/**
 * The months the public picker shows, from this one forward.
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
  locale: "pt" | "en";
  months?: number;
  occupancy?: OccupancyMap;
  today?: DateKey;
}): Promise<PublicMonth[]> {
  const {
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
 * posting it wants, and by the time it arrives the driver may be out, the car
 * may be taken by a booking on the *other* tour, or the departure may have been
 * closed. Everything that accepts a date from a guest goes through here.
 *
 * A database failure is a "no". A booking engine that cannot read availability
 * must not fall back to accepting the date; the guest is told to try again,
 * which is true, rather than being sold a day nobody can confirm.
 */
export async function checkSlotAvailable(options: {
  experienceSlug: string;
  date: string;
  slot: AvailabilitySlot;
  partySize: number;
  occupancy?: SlotOccupancy;
  today?: DateKey;
}): Promise<
  | { ok: true; slot: SlotAvailability; vehicleClass: VehicleClass }
  | {
      ok: false;
      reason:
        | "invalid"
        | "unavailable"
        | "no-vehicle"
        | "party-too-large"
        | "bad-party"
        | "unreadable";
    }
> {
  const { experienceSlug, date, slot, partySize, occupancy, today } = options;

  if (!isDateKey(date) || !isTourSlot(slot)) return { ok: false, reason: "invalid" };

  let row: AvailabilityRow | undefined;
  try {
    row = await readDay(date, slot);
  } catch (err) {
    console.error("[availability] could not re-check a submitted date", err);
    return { ok: false, reason: "unreadable" };
  }

  const described = describeSlot({ date, slot, row, occupancy, today });
  const fit = fitsParty(described, experienceSlug, partySize);
  if (!fit.ok) {
    // "No driver left" is the departure being full, which from the guest's
    // side is the same fact as it being closed: it is not available, and why
    // is the family's business.
    return {
      ok: false,
      reason: fit.reason === "no-driver" ? "unavailable" : fit.reason,
    };
  }

  return { ok: true, slot: described, vehicleClass: fit.vehicleClass };
}

/**
 * Whether any departure of a day could still take *someone*.
 *
 * The loose check the enquiry form wants. An enquiry names a tour vaguely (or
 * not at all) and may be for fourteen people — which is exactly the lead the
 * team wants and precisely what the checkout refuses — so asking
 * {@link checkSlotAvailable} about it would throw away good business. All this
 * asks is whether the day is on the calendar and not fully committed.
 *
 * A database failure is a "yes" here, the opposite of the checkout's rule and
 * for the opposite reason: nothing is being sold, and refusing to record an
 * enquiry because a count timed out loses a lead to protect nothing.
 */
export async function checkDayBookable(options: {
  date: string;
  occupancy?: OccupancyMap;
  today?: DateKey;
}): Promise<boolean> {
  const { date, occupancy, today } = options;
  if (!isDateKey(date)) return false;

  let rows: AvailabilityRow[];
  try {
    rows = await listAvailabilityRows(date, date);
  } catch (err) {
    console.error("[availability] could not check an enquiry's preferred day", err);
    return true;
  }

  const byKey = new Map(rows.map((row) => [occupancySlotKey(row.date, row.slot), row]));
  return TOUR_SLOTS.some(
    (slot) =>
      describeSlot({
        date,
        slot,
        row: byKey.get(occupancySlotKey(date, slot)) ?? null,
        occupancy: occupancy?.get(occupancySlotKey(date, slot)),
        today,
      }).bookable,
  );
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

/**
 * The longest stretch one gesture may write — a leap year, to the day.
 *
 * Exported because the season card has to be able to *say* it: a confirmation
 * that promises four hundred days when the write stops at three hundred and
 * sixty-six is worse than no confirmation at all. The page reads it and hands
 * it to the client component, the way it already hands down the roster
 * numbers, because this module is `server-only`.
 */
export const MAX_RANGE_DAYS = 366;

/**
 * Every day from `from` to `to`, inclusive — the seasonal window as a list.
 *
 * Rita's "we are closed until April" is one gesture, and it has to reach the
 * database as the rows it means. The range is expressed as two dates rather
 * than posted as three hundred hidden inputs, and expanded here where the
 * cap can be enforced: `limit` days at most, so a crafted `to` of 2999 cannot
 * ask Postgres to write a third of a million rows. Backwards ranges give
 * nothing rather than throwing — a form with the dates the wrong way round is
 * a mis-tap, not an attack.
 */
export function expandDateRange(
  from: DateKey,
  to: DateKey,
  limit = MAX_RANGE_DAYS,
): DateKey[] {
  const start = parseDateKey(from);
  const end = parseDateKey(to);
  if (!start || !end || start > end) return [];

  const days: DateKey[] = [];
  for (
    let day = start;
    day <= end && days.length < limit;
    day = new Date(day.getTime() + 86_400_000)
  ) {
    days.push(dateKey(day));
  }
  return days;
}

/**
 * Open, close or adjust a set of departures, in one statement.
 *
 * An upsert rather than a read-then-write: the admin's "close the whole
 * winter" button touches hundreds of departures at once, most of which have no
 * row, and doing that as hundreds of round trips from a phone on rural 4G is
 * the difference between a tap and a wait. `onConflictDoUpdate` resolves onto
 * `availability_date_slot_key`, which is the index that makes
 * one-row-per-day-per-departure true.
 *
 * **`status` is the only field a write always sets.** `drivers` and `note`
 * change only when the caller passes them, and are otherwise left exactly as
 * the row already had them. This is the difference between "close August" and
 * "close August and forget everything anybody wrote about it": the note is
 * *why* a day is shut — "Casamento", "carro na revisão" — and the roster is
 * Rita's answer to who is actually driving. A sweep across a hundred days
 * knows neither of those things, so it must not have an opinion about them,
 * and passing the defaults would be exactly such an opinion. Rows that do not
 * exist yet still get the column defaults (`DRIVERS_PER_SLOT`, no note),
 * because there is nothing there to preserve.
 *
 * Passing `note: null` *is* explicit, and clears it — that is the day sheet
 * emptying the field. Only leaving the key out preserves.
 *
 * Returns the rows as they now stand, so the caller can audit what actually
 * changed rather than what it asked for.
 */
export async function upsertDays(options: {
  dates: DateKey[];
  slots: AvailabilitySlot[];
  status: AvailabilityStatus;
  /** Left alone when absent. A number replaces the roster on every row named. */
  drivers?: number;
  /** Left alone when absent; `null` clears it. */
  note?: string | null;
}): Promise<AvailabilityRow[]> {
  const { dates, slots, status } = options;
  if (dates.length === 0 || slots.length === 0) return [];

  // Built once and used for both halves of the upsert, so the insert and the
  // update cannot disagree about which fields this write is addressed to.
  const edits: { drivers?: number; note?: string | null } = {};
  if (options.drivers !== undefined) edits.drivers = options.drivers;
  if (options.note !== undefined) edits.note = options.note;

  const now = new Date();

  return db
    .insert(availability)
    .values(
      dates.flatMap((date) => slots.map((slot) => ({ date, slot, status, ...edits }))),
    )
    .onConflictDoUpdate({
      target: [availability.date, availability.slot],
      set: { status, ...edits, updatedAt: now },
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
  dates: DateKey[];
  slots: AvailabilitySlot[];
}): Promise<number> {
  const { dates, slots } = options;
  if (dates.length === 0 || slots.length === 0) return 0;
  const removed = await db
    .delete(availability)
    .where(and(inArray(availability.date, dates), inArray(availability.slot, slots)))
    .returning({ id: availability.id });
  return removed.length;
}
