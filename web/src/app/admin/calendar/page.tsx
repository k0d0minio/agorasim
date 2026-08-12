import { requireAdmin } from "@/lib/admin-auth";
import {
  addMonths,
  DEFAULT_CAPACITY,
  formatDay,
  formatMonth,
  isMonthInWindow,
  isMonthKey,
  MAX_CAPACITY,
  monthGrid,
  monthOf,
  monthWindow,
  readMonth,
  todayKey,
  WEEKDAY_INITIALS,
  type MonthKey,
} from "@/lib/availability";
import { AdminShell } from "@/components/admin/admin-shell";
import {
  AvailabilityCalendar,
  type CalendarDay,
} from "@/components/admin/availability-calendar";

// Reads live data — never prerender at build time.
export const dynamic = "force-dynamic";

/**
 * The availability calendar: which days are on sale.
 *
 * This is the supply side of the booking engine and the screen the team opens
 * most often. A day with no row on it cannot be booked by anybody — see the
 * note on the `availability` table for why that is the safe default and this
 * page is the answer to the work it creates.
 *
 * The month lives in the URL rather than in client state, so paging is real
 * navigation: the installed PWA's back-swipe works, and a reload comes back to
 * the month the operator was planning.
 */
export default async function AdminCalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  await requireAdmin();

  const today = todayKey();
  const requested = (await searchParams).month;
  // An unknown or out-of-window month falls back to this one rather than 404s:
  // the value comes from a link, and the useful response to a stale one is the
  // calendar, not an error page.
  const month: MonthKey =
    isMonthKey(requested) && isMonthInWindow(requested, today)
      ? requested
      : monthOf(today);

  const { first, last } = monthWindow(today);
  const previousMonth = month > first ? addMonths(month, -1) : null;
  const nextMonth = month < last ? addMonths(month, 1) : null;

  /*
   * `booked` is 0 on every day here: the bookings table lands with checkout,
   * and this page will pass its per-day counts in as `bookedByDate` when it
   * does. Until then "seats left" is simply capacity, which is true — nothing
   * has been sold through the site yet.
   */
  const days = await readMonth({ month, today });

  const calendarDays: CalendarDay[] = days.map((day) => ({
    ...day,
    // Formatted here because the date helpers are server-only; the client
    // component renders the string it is given.
    longLabel: formatDay(day.date, "en"),
  }));

  return (
    <AdminShell>
      <p className="mb-4 text-sm text-muted-foreground">
        Tap a day to put it on sale, close it, or set how many seats it has. Days that
        aren&apos;t on the calendar can&apos;t be booked at all.
      </p>

      <AvailabilityCalendar
        monthLabel={formatMonth(month, "en")}
        weekdays={WEEKDAY_INITIALS.en}
        grid={monthGrid(month)}
        days={calendarDays}
        previousMonth={previousMonth}
        nextMonth={nextMonth}
        defaultCapacity={DEFAULT_CAPACITY}
        maxCapacity={MAX_CAPACITY}
      />
    </AdminShell>
  );
}
