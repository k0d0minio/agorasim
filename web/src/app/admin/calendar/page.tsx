import { requireAdmin } from "@/lib/admin-auth";
import {
  addMonths,
  defaultCapacityFor,
  formatDay,
  formatMonth,
  isMonthInWindow,
  isMonthKey,
  MAX_CAPACITY,
  monthBounds,
  monthGrid,
  monthOf,
  monthWindow,
  readMonth,
  todayKey,
  WEEKDAY_INITIALS,
  type MonthKey,
} from "@/lib/availability";
import { countSlotOccupancy } from "@/lib/bookings";
import { listCatalogue, signatureOf } from "@/lib/experience-catalogue";
import { AdminShell } from "@/components/admin/admin-shell";
import {
  AvailabilityCalendar,
  type CalendarDay,
  type CalendarTour,
} from "@/components/admin/availability-calendar";

// Reads live data — never prerender at build time.
export const dynamic = "force-dynamic";

/**
 * The availability calendar: which departures are on sale.
 *
 * This is the supply side of the booking engine and the screen the team opens
 * most often. A departure with no row on it cannot be booked by anybody — see
 * the note on the `availability` table for why that is the safe default and
 * this page is the answer to the work it creates.
 *
 * Both the month *and the tour* live in the URL rather than in client state,
 * so paging is real navigation: the installed PWA's back-swipe works, and a
 * reload comes back to the calendar the operator was planning.
 */
export default async function AdminCalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; experience?: string }>;
}) {
  await requireAdmin();

  const today = todayKey();
  const params = await searchParams;

  // The tours whose calendars can be planned: active signature entries.
  const catalogue = (await listCatalogue()).filter((entry) => entry.active);
  const tourEntries = catalogue.filter((entry) => entry.kind === "signature");
  const fallbackTour = signatureOf(tourEntries) ?? tourEntries[0];
  const tour =
    tourEntries.find((entry) => entry.slug === params.experience) ?? fallbackTour;

  if (!tour) {
    return (
      <AdminShell>
        <p className="text-sm text-muted-foreground">
          No bookable tours in the catalogue yet — add one under Experiences first.
        </p>
      </AdminShell>
    );
  }

  // An unknown or out-of-window month falls back to this one rather than 404s:
  // the value comes from a link, and the useful response to a stale one is the
  // calendar, not an error page.
  const month: MonthKey =
    isMonthKey(params.month) && isMonthInWindow(params.month, today)
      ? params.month
      : monthOf(today);

  const { first, last } = monthWindow(today);
  const previousMonth = month > first ? addMonths(month, -1) : null;
  const nextMonth = month < last ? addMonths(month, 1) : null;

  // Supply and demand, read together: the seats each departure has, minus the
  // ones sold into it (confirmed bookings, plus holds that have not lapsed).
  const { first: monthStart, last: monthEnd } = monthBounds(month);
  const occupancy = await countSlotOccupancy({
    experienceSlug: tour.slug,
    from: monthStart,
    to: monthEnd,
  });
  const days = await readMonth({ experienceSlug: tour.slug, month, today, occupancy });

  const calendarDays: CalendarDay[] = days.map((day) => ({
    ...day,
    // Formatted here because the date helpers are server-only; the client
    // component renders the string it is given.
    longLabel: formatDay(day.date, "en"),
  }));

  const tours: CalendarTour[] = tourEntries.map((entry) => ({
    slug: entry.slug,
    name: entry.title.en || entry.title.pt,
  }));

  return (
    <AdminShell>
      <p className="mb-4 text-sm text-muted-foreground">
        Two departures a day — 10:00 and 14:00 — per tour. Tap a day to put its
        departures on sale, close them, or set how many seats they have. Departures
        that aren&apos;t on the calendar can&apos;t be booked at all.
      </p>

      <AvailabilityCalendar
        experience={tour.slug}
        tours={tours}
        month={month}
        monthLabel={formatMonth(month, "en")}
        weekdays={WEEKDAY_INITIALS.en}
        grid={monthGrid(month)}
        days={calendarDays}
        previousMonth={previousMonth}
        nextMonth={nextMonth}
        defaultCapacity={defaultCapacityFor(tour.slug)}
        maxCapacity={MAX_CAPACITY}
      />
    </AdminShell>
  );
}
