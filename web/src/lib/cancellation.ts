/**
 * The cancellation policy, as arithmetic.
 *
 * "Free cancellation up to 48 hours before the experience" is a promise the
 * site has made on three surfaces for months (`content/booking.ts`,
 * `content/experiences.ts`, `content/emails.ts`) without anything anywhere
 * being able to decide whether a given booking is inside it or outside it. This
 * module is that decision, and it is deliberately the *only* copy of it: the
 * page, the server action and the tests all ask the same function, so the
 * sentence a guest reads and the branch that refunds them cannot drift.
 *
 * **Pure, and free of `next/*`, the database and Stripe** — the same discipline
 * `cancellation-token.ts` keeps, for the same reason. The interesting cases
 * here are all clock cases (a booking two days out, one an hour past its
 * deadline, one whose tour already left, a deadline that straddles a DST
 * change), and every one of them should be testable by passing a `now` rather
 * than by standing up a booking and waiting.
 *
 * **The clock is Europe/Lisbon, not the server's.** A deadline computed in a
 * Frankfurt function's local time is an hour wrong for eight months of the
 * year — which, on a boundary this one, is the difference between refunding a
 * guest and telling them to phone. `lib/availability.ts` already draws this
 * line for calendar days; this draws it for instants.
 */

import { BUSINESS_TIME_ZONE, isDateKey } from "@/lib/availability";
import { departureHour } from "@/content/logistics";
import type { Locale } from "@/i18n/config";
import { siteUrl } from "@/lib/site-origin";

/**
 * The notice the policy promises. One number, named, because it appears in
 * bilingual copy as "48" and in arithmetic as milliseconds, and those two must
 * be the same 48.
 */
export const CANCELLATION_NOTICE_HOURS = 48;

const HOUR_MS = 60 * 60 * 1000;

const zonedParts = new Intl.DateTimeFormat("en-CA", {
  timeZone: BUSINESS_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

/**
 * How far Europe/Lisbon is from UTC at a given instant, in milliseconds.
 *
 * Formatted-then-reparsed rather than table-driven: the platform already ships
 * the tz database and keeps it current, and a hand-rolled "last Sunday in
 * March" rule is a thing that is right until the year it isn't.
 */
function zoneOffsetMs(instant: Date): number {
  const parts = zonedParts.formatToParts(instant);
  const read = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? "0");
  // `hour12: false` renders midnight as 24 in some ICU versions; both mean the
  // same instant, and `Date.UTC` normalises the roll-over for us.
  const asUtc = Date.UTC(
    read("year"),
    read("month") - 1,
    read("day"),
    read("hour"),
    read("minute"),
    read("second"),
  );
  return asUtc - instant.getTime();
}

/**
 * A wall-clock time in Portugal → the instant it happens.
 *
 * Two passes. The first guesses the offset by reading it at the same wall time
 * *in UTC*, which is right except within an hour of a DST change; the second
 * re-reads it at the candidate instant and corrects. Portugal's departures are
 * at 10:00 and 14:00 and its transitions are at 01:00, so the correction never
 * fires in practice — it is here so that the day somebody sells an 01:30
 * departure, this returns an instant rather than an off-by-an-hour deadline.
 */
export function businessInstant(date: string, hour: number): Date | null {
  if (!isDateKey(date)) return null;
  const [year, month, day] = date.split("-").map(Number);

  const naive = Date.UTC(year, month - 1, day, hour);
  const firstPass = new Date(naive - zoneOffsetMs(new Date(naive)));
  return new Date(naive - zoneOffsetMs(firstPass));
}

/** The facts about a booking this module needs — never the whole row. */
export type BookingWhen = {
  date: string;
  slot: string;
  experienceSlug: string;
};

/** When a booking's tour actually leaves. `null` for an unparseable date. */
export function departureInstant(booking: BookingWhen): Date | null {
  return businessInstant(booking.date, departureHour(booking.experienceSlug, booking.slot));
}

/**
 * Where one booking stands against the policy, right now.
 *
 * `departed` is kept apart from `tooLate` even though both refuse: they are the
 * same answer to the guest ("talk to us") but different answers to anyone
 * reading the logs, and the page says something different for each — offering
 * to reschedule a tour that has already run would read as a machine that has
 * not noticed.
 */
export type CancellationWindow = {
  /** When the tour leaves. `null` only if the row's date is unparseable. */
  departsAt: Date | null;
  /** The last instant a self-serve cancellation is allowed. */
  deadline: Date | null;
  /** Whole hours from `now` until departure; negative once it has left. */
  hoursUntilDeparture: number;
  /** The one field the route branches on. */
  verdict: "free" | "too-late" | "departed" | "unknown";
};

/**
 * Decide the window.
 *
 * The boundary is `now < deadline`, so a guest landing on the page at the
 * *exact* 48-hour mark is inside the free window — the promise says "up to 48
 * hours before", and the reading that favours the guest is the one the business
 * has already published.
 */
export function cancellationWindow(
  booking: BookingWhen,
  now: Date = new Date(),
): CancellationWindow {
  const departsAt = departureInstant(booking);
  if (!departsAt) {
    return {
      departsAt: null,
      deadline: null,
      hoursUntilDeparture: 0,
      verdict: "unknown",
    };
  }

  const deadline = new Date(departsAt.getTime() - CANCELLATION_NOTICE_HOURS * HOUR_MS);
  const msUntil = departsAt.getTime() - now.getTime();
  // Truncated toward zero: "in 3 hours" while there are three and a half, and
  // "-1" once the tour left an hour ago. Rounding up would let a page say a
  // tour leaves in 48 hours when the deadline has already passed.
  const hoursUntilDeparture = Math.trunc(msUntil / HOUR_MS);

  const verdict: CancellationWindow["verdict"] =
    msUntil <= 0 ? "departed" : now.getTime() < deadline.getTime() ? "free" : "too-late";

  return { departsAt, deadline, hoursUntilDeparture, verdict };
}

/**
 * Where a cancel link points.
 *
 * Not in `lib/routes.ts`, on the same reasoning as the Stripe return page: this
 * is a transactional URL reached once, from an email, carrying a credential. It
 * has no place in the nav, the sitemap or the hreflang set — and putting it in
 * the route table would invite exactly that.
 *
 * The locale is the guest's own, so the page opens in the language their
 * confirmation was written in.
 */
export function cancelUrl(locale: Locale, token: string): string {
  return `${siteUrl()}/${locale}/reserva/cancelar/${token}`;
}
