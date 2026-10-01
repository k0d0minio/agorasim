/**
 * Date keys — the day arithmetic the booking engine runs on, safe to import
 * from the browser.
 *
 * It used to live inside `lib/availability.ts`, which is `server-only` because
 * it also holds the queries. The public picker on `/reservar` needs the same
 * answer to "what is today in Sintra, and which is the first day a guest may
 * book?" — the page is cached for up to an hour, so just after midnight the
 * payload it was built with can still offer tomorrow. Moving the arithmetic
 * here rather than copying it is what keeps the browser and the server
 * counting the notice the same way. `lib/availability.ts` re-exports all of
 * it, so server code keeps importing from there.
 *
 * Pure: no database, no `server-only`, no React.
 */

/**
 * Calendar days of notice a guest booking online must give (D-3).
 *
 * Counted in days, not hours: on a Monday the first bookable day is
 * Wednesday, both departures, whatever the time on Monday.
 */
export const ONLINE_NOTICE_DAYS = 2;

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

/**
 * The key `days` calendar days after `key` (negative goes back).
 *
 * Arithmetic on UTC midnights, never on "now": a key is a day in Sintra, and
 * adding 48 hours to an instant near midnight is how two days' notice turns
 * into one.
 */
export function addDays(key: DateKey, days: number): DateKey {
  const date = parseDateKey(key);
  if (!date) return key;
  return dateKey(new Date(date.getTime() + days * 86_400_000));
}

/**
 * The first day a guest may book online on `today` — today plus the notice
 * (D-3). The other end of the online window is the six-month horizon, which
 * the payload already enforces by never carrying a day past it.
 */
export function firstOnlineDay(today: DateKey = todayKey()): DateKey {
  return addDays(today, ONLINE_NOTICE_DAYS);
}
