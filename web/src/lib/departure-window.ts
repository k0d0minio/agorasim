/**
 * Every departure between today and a horizon, described once.
 *
 * Two screens need the same thing and neither can get it from
 * `lib/availability.ts` alone: the move picker asks "where else could this
 * booking go?", and the Sales board's manual booking asks "which departures can
 * still be sold?". Both answers are the calendar's own supply-and-demand
 * arithmetic — {@link describeSlot} over the stored rows and what is already
 * committed against them — read across a window rather than a month.
 *
 * It lives here rather than in `lib/availability.ts` because the demand half
 * comes from `lib/bookings.ts`, which imports `lib/availability.ts`; the join
 * has to sit above both. Before this module the scan lived inside
 * `lib/booking-move.ts`, where a second caller could only have copied it — and
 * a second copy of the capacity read is how a Saturday ends up sold twice.
 */
import "server-only";

import type { AvailabilitySlot } from "@/db";
import { departureLabel } from "@/content/logistics";
import { t, type Locale } from "@/i18n/config";
import {
  describeSlot,
  expandDateRange,
  formatDay,
  listAvailabilityRows,
  occupancySlotKey,
  todayKey,
  TOUR_SLOTS,
  type DateKey,
  type DaySlots,
} from "@/lib/availability";
import { countSlotOccupancy } from "@/lib/bookings";

/** One departure of one day — the pair every picker on this side deals in. */
export type Departure = { date: DateKey; slot: AvailabilitySlot };

/** Whether the same departure is meant by both. */
export function sameDeparture(a: Departure, b: Departure): boolean {
  return a.date === b.date && a.slot === b.slot;
}

/**
 * Describe every departure from `today` out to the horizon.
 *
 * Two reads for the whole window — the opened days and what is committed
 * against them — rather than one per candidate departure: a picker needs all of
 * them at once, and the alternative is a hundred and eighty round trips to
 * render one dialog.
 */
export async function readDepartureWindow(options: {
  today?: DateKey;
  horizonDays: number;
}): Promise<DaySlots[]> {
  const { today = todayKey(), horizonDays } = options;

  const days = expandDateRange(
    today,
    // `expandDateRange` caps at a leap year, so the window is whatever is
    // asked for or that ceiling — never an unbounded scan.
    lastDayOfWindow(today, horizonDays),
    horizonDays,
  );
  if (days.length === 0) return [];

  const windowStart = days[0];
  const windowEnd = days[days.length - 1];
  const [rows, occupancy] = await Promise.all([
    listAvailabilityRows(windowStart, windowEnd),
    countSlotOccupancy({ from: windowStart, to: windowEnd }),
  ]);
  const byKey = new Map(rows.map((row) => [occupancySlotKey(row.date, row.slot), row]));

  return days.map((date) => ({
    date,
    slots: TOUR_SLOTS.map((slot) =>
      describeSlot({
        date,
        slot,
        row: byKey.get(occupancySlotKey(date, slot)) ?? null,
        occupancy: occupancy.get(occupancySlotKey(date, slot)),
        today,
      }),
    ),
  }));
}

/** The last day of a window `days` long that starts on `today`, inclusive. */
function lastDayOfWindow(today: DateKey, days: number): DateKey {
  const start = Date.parse(`${today}T00:00:00Z`);
  return new Date(start + Math.max(0, days - 1) * 86_400_000).toISOString().slice(0, 10);
}

/** The picker's options for one day: the day, named, and its departures. */
export type DepartureGroup = {
  date: DateKey;
  /** "sábado, 15 de agosto de 2026" — the date helpers are server-only. */
  label: string;
  slots: { slot: AvailabilitySlot; label: string }[];
};

/**
 * Group departures by day and name them, for a client component to render.
 *
 * Done here rather than in a dialog because `formatDay` and the departure
 * labels are server-side content: the browser is handed strings it can put on
 * screen, not a second copy of the vocabulary.
 */
export function groupDepartures(
  departures: Departure[],
  /**
   * The tour the departures are being sold or moved as, for its own wording of
   * "morning" — or `null` where the tour is not settled yet (the Sales board
   * picks the day before the route), which falls back to the generic labels.
   */
  experienceSlug: string | null,
  locale: Locale = "pt",
): DepartureGroup[] {
  const byDate = new Map<DateKey, DepartureGroup>();

  for (const departure of departures) {
    const group =
      byDate.get(departure.date) ??
      { date: departure.date, label: formatDay(departure.date, locale), slots: [] };
    group.slots.push({
      slot: departure.slot,
      label: t(departureLabel(experienceSlug ?? "", departure.slot), locale),
    });
    byDate.set(departure.date, group);
  }

  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}
