import { requireAdmin } from "@/lib/admin-auth";
import {
  addMonths,
  DEFAULT_DRIVERS,
  formatDay,
  formatMonth,
  isMonthInWindow,
  isDateKey,
  isMonthKey,
  MAX_DRIVERS,
  monthBounds,
  monthGrid,
  monthOf,
  monthWindow,
  readMonth,
  todayKey,
  WEEKDAY_INITIALS,
  type MonthKey,
} from "@/lib/availability";
import { countSlotOccupancy, bookingsBetween } from "@/lib/bookings";
import { eventHoldsBetween } from "@/lib/event-holds";
import { quoteRef } from "@/lib/quotes";
import { FLEET } from "@/lib/fleet";
import { catalogueIndex, listCatalogue } from "@/lib/experience-catalogue";
import { t } from "@/i18n/config";
import { AdminShell } from "@/components/admin/admin-shell";
import {
  AvailabilityCalendar,
  type CalendarDay,
  type CalendarEvent,
  type Selection,
} from "@/components/admin/availability-calendar";

// Reads live data — never prerender at build time.
export const dynamic = "force-dynamic";

/**
 * The availability calendar: which days the team is off.
 *
 * This is the supply side of the booking engine and the screen the team opens
 * most often. Every departure is on sale unless the team blocks it
 * (`open-by-default`), so all this page asks of Diogo & Rita is the days they
 * cannot run — see the component for the gesture (`admin-block-days`).
 *
 * **One calendar, not one per tour.** It used to have a tab per tour, which
 * quietly promised that opening a Saturday for Rural Saloia left Óbidos alone.
 * It never did: the constraint is two drivers across four cars for the whole
 * business (AGORA-012), so there is one calendar and every tour draws on it.
 * The tab strip is gone and so is `?experience=` — the URL carries the month,
 * so paging is still real navigation: the installed PWA's back-swipe works,
 * and a reload comes back to the month the operator was planning. It also
 * carries the selection (`?from=&to=`), which is how a stretch tapped across
 * two months survives the page in between.
 */
export default async function AdminCalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; from?: string; to?: string }>;
}) {
  await requireAdmin();

  const today = todayKey();
  const params = await searchParams;

  // An unknown or out-of-window month falls back to this one rather than 404s:
  // the value comes from a link, and the useful response to a stale one is the
  // calendar, not an error page.
  const month: MonthKey =
    isMonthKey(params.month) && isMonthInWindow(params.month, today)
      ? params.month
      : monthOf(today);

  // The selection the calendar left in the address. Past days cannot be
  // selected, so a stale link to one is simply no selection.
  const selectedFrom =
    isDateKey(params.from) && params.from >= today ? params.from : null;
  const selectedTo =
    selectedFrom && isDateKey(params.to) && params.to >= selectedFrom ? params.to : null;
  const initialSelection: Selection | null = selectedFrom
    ? { anchor: selectedFrom, end: selectedTo }
    : null;

  const { first, last } = monthWindow(today);
  const previousMonth = month > first ? addMonths(month, -1) : null;
  const nextMonth = month < last ? addMonths(month, 1) : null;

  // Supply and demand, read together: the drivers and cars each departure has,
  // minus the ones already out (confirmed bookings, plus holds that have not
  // lapsed) — on any tour, which is the whole point. The catalogue names the
  // tours behind those bookings for the day sheet.
  const { first: monthStart, last: monthEnd } = monthBounds(month);
  const [occupancy, catalogue] = await Promise.all([
    countSlotOccupancy({ from: monthStart, to: monthEnd }),
    listCatalogue(),
  ]);
  // The team's view: today, tomorrow and blocked departures are theirs to sell
  // on the phone (D-4), so the grid and the day sheet are described as they sell.
  const days = await readMonth({ month, today, occupancy, audience: "team" });
  const [bookings, events] = await Promise.all([
    bookingsBetween({ from: monthStart, to: monthEnd }),
    // The deposit-paid weddings and events that hold their whole day — the
    // occupancy above already refuses those days; this is who and where, for
    // the day sheet (`lib/event-holds.ts`).
    eventHoldsBetween({ from: monthStart, to: monthEnd }),
  ]);

  const calendarDays: CalendarDay[] = days.map((day) => ({
    ...day,
    // Formatted here because the date helpers are server-only; the client
    // component renders the string it is given.
    longLabel: formatDay(day.date, "pt"),
  }));

  // The day sheet lists who is actually coming, so the client needs the tour
  // names and the bookings grouped by date — both shaped here, server-side.
  const index = catalogueIndex(catalogue);
  const experienceNames = Object.fromEntries(
    [...index.entries()].map(([slug, entry]) => [slug, t(entry.title, "pt")]),
  );
  // The tours the "Nova reserva" sheet can sell: active signature tours only.
  // The manual path records cash sales against the two flagships; a retired
  // tour takes no new money, and anything else is an add-on, not a tour.
  const tours = catalogue
    .filter((entry) => entry.kind === "signature" && entry.active)
    .map((entry) => ({ slug: entry.slug, title: t(entry.title, "pt") }));
  const bookingsByDate = bookings.reduce<Record<string, typeof bookings>>(
    (groups, booking) => {
      (groups[booking.date] ??= []).push(booking);
      return groups;
    },
    {},
  );

  const eventsByDate = events.reduce<Record<string, CalendarEvent[]>>((groups, event) => {
    (groups[event.date] ??= []).push({
      ref: quoteRef(event.quoteId),
      tourRequestId: event.tourRequestId,
      kind: event.kind,
      name: event.name,
      venue: event.venue,
    });
    return groups;
  }, {});

  return (
    <AdminShell>
      <p className="mb-4 text-sm text-muted-foreground">
        Todos os dias estão abertos a reservas. Para bloquear, toque num dia — ou
        no primeiro e no último de um período — e escolha Bloquear em baixo.
      </p>

      <AvailabilityCalendar
        month={month}
        monthLabel={formatMonth(month, "pt")}
        weekdays={WEEKDAY_INITIALS.pt}
        grid={monthGrid(month)}
        days={calendarDays}
        previousMonth={previousMonth}
        nextMonth={nextMonth}
        defaultDrivers={DEFAULT_DRIVERS}
        maxDrivers={MAX_DRIVERS}
        fleet={FLEET.map((vehicle) => ({ name: vehicle.name, seats: vehicle.seats }))}
        bookingsByDate={bookingsByDate}
        eventsByDate={eventsByDate}
        experienceNames={experienceNames}
        tours={tours}
        initialSelection={initialSelection}
      />
    </AdminShell>
  );
}
