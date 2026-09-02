/**
 * The 48-hour promise, as arithmetic.
 *
 * "Cancelamento gratuito até 48 horas antes da experiência" is printed on the
 * booking page (`content/booking.ts`), in the confirmation email
 * (`content/emails.ts`) and on every experience page. This module is the one
 * place that decides what it means, so the cancel route cannot drift from the
 * sentence the guest was sold.
 *
 * **Against the departure, not against midnight.** A booking stores a `date`
 * and a `slot`, not an instant — `bookings.date` is a day and nothing more. A
 * deadline computed from the day alone would be wrong by up to fourteen hours,
 * in the direction that matters: a guest cancelling at 09:00 on the 13th for a
 * 10:00 departure on the 15th is inside 48 hours of *their tour* and outside 48
 * hours of *midnight on the 15th*. So the departure is reconstructed from the
 * slot's clock time before anything is subtracted.
 *
 * **Europe/Lisbon, because that is where the car leaves from.** The server runs
 * in UTC and Portugal is UTC+1 for eight months of the year — the same reason
 * `todayKey` in `lib/availability.ts` formats through the business timezone
 * rather than the process one. An hour of drift here is an hour of free
 * cancellation the business did not offer, or an hour it did and refused.
 *
 * Pure: no database, no `next/*`, no `server-only`. The route decides what to
 * do with the answer; this file only knows what time it is in Sintra.
 */

import { BUSINESS_TIME_ZONE, isDateKey, type DateKey } from "@/lib/availability";

/**
 * The promise itself. Changing this number changes the policy everywhere it is
 * enforced — the copy that states it lives in `content/` and has to move too.
 */
export const FREE_CANCELLATION_HOURS = 48;

/**
 * When each departure actually leaves, in Lisbon local time.
 *
 * The hours are the ones the business runs and the ones `TOUR_SLOTS` documents:
 * 10:00 and 14:00. Óbidos has not had its clock times confirmed
 * (`content/logistics.ts`), and it still departs on this grid — its morning is
 * a morning — so it is measured against the same hours until Diogo & Rita say
 * otherwise. Assuming the *earlier* of any two plausible times is the
 * conservative direction: it closes the window sooner, which sends a borderline
 * guest to the phone rather than auto-refunding a tour that leaves in 47 hours.
 */
const SLOT_DEPARTURE_HOUR: Record<string, number> = {
  morning: 10,
  afternoon: 14,
  // Dead in practice — the 0012 migration moved every `full_day` row to
  // `morning` — but the enum value still exists, so it gets the earlier hour
  // rather than an undefined one.
  full_day: 10,
};

/** The hour a slot leaves at, defaulting to the earlier departure. */
function departureHour(slot: string): number {
  return SLOT_DEPARTURE_HOUR[slot] ?? SLOT_DEPARTURE_HOUR.morning;
}

const zoneParts = new Intl.DateTimeFormat("en-US", {
  timeZone: BUSINESS_TIME_ZONE,
  hour12: false,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

/**
 * How far ahead of UTC Lisbon is at `instant`, in milliseconds.
 *
 * Read out of `Intl` rather than from a table, so the answer keeps following
 * the tz database — including the Sunday in March when it changes.
 */
function zoneOffsetMs(instant: Date): number {
  const parts = zoneParts.formatToParts(instant);
  const read = (type: Intl.DateTimeFormatPartTypes): number =>
    Number(parts.find((part) => part.type === type)?.value ?? "0");
  // `en-US` with hour12:false renders midnight as hour 24 in some engines.
  const hour = read("hour") % 24;
  const asIfUtc = Date.UTC(
    read("year"),
    read("month") - 1,
    read("day"),
    hour,
    read("minute"),
    read("second"),
  );
  return asIfUtc - instant.getTime();
}

/**
 * The instant a `(date, slot)` departure leaves, or `null` for a date key that
 * is not a day.
 *
 * Two passes over the offset, which is what makes a DST changeover come out
 * right: the first guess is read at the wrong side of the transition when the
 * departure is within an hour of it, and re-reading the offset *at the guessed
 * instant* settles it. Neither departure hour can fall in the spring-forward
 * gap (01:00–02:00 in Portugal), so there is no third case to handle.
 */
export function departureInstant(date: DateKey, slot: string): Date | null {
  if (!isDateKey(date)) return null;
  const [year, month, day] = date.split("-").map(Number);
  const wallClock = Date.UTC(year, month - 1, day, departureHour(slot), 0, 0);

  let instant = wallClock - zoneOffsetMs(new Date(wallClock));
  instant = wallClock - zoneOffsetMs(new Date(instant));
  return new Date(instant);
}

/** Where a booking stands against the promise, at one moment. */
export type CancellationWindow = {
  /** When the car actually leaves. */
  departsAt: Date;
  /** The last instant a guest may cancel themselves. */
  deadline: Date;
  /** True while self-serve cancellation is still on offer. */
  open: boolean;
};

/**
 * Whether this booking can still be called off by its own guest.
 *
 * `null` for a booking whose date is unreadable — a caller must not be able to
 * mistake "we cannot tell" for "yes". The route treats it as closed and points
 * the guest at the phone, which is what the team would want to happen to a row
 * nobody can date.
 *
 * The boundary itself is inclusive: at exactly 48 hours the window is still
 * open, because "up to 48 hours before" says it is.
 */
export function cancellationWindow(
  booking: { date: DateKey; slot: string },
  now: Date = new Date(),
): CancellationWindow | null {
  const departsAt = departureInstant(booking.date, booking.slot);
  if (!departsAt) return null;

  const deadline = new Date(
    departsAt.getTime() - FREE_CANCELLATION_HOURS * 60 * 60 * 1000,
  );

  return { departsAt, deadline, open: now.getTime() <= deadline.getTime() };
}

/**
 * The deadline as a guest reads it — "quinta-feira, 13 de agosto de 2026, 10h00".
 *
 * Formatted in the business timezone for the same reason it was computed in it:
 * a deadline rendered in UTC would tell an August guest 09:00 when the answer
 * is 10:00, and being wrong about a deadline by an hour is worse than not
 * printing one.
 */
export function formatDeadline(deadline: Date, locale: "pt" | "en"): string {
  return new Intl.DateTimeFormat(locale === "pt" ? "pt-PT" : "en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: BUSINESS_TIME_ZONE,
  }).format(deadline);
}
