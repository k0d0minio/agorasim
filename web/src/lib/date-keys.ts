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

const businessClockFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: BUSINESS_TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** Minutes since midnight on the business's clock — 09:59 in Sintra is 599, in any season. */
export function minutesOfDay(now: Date = new Date()): number {
  const parts = businessClockFormatter.formatToParts(now);
  const part = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  return part("hour") * 60 + part("minute");
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
 * {@link addDays}, strict: a key that is not a `YYYY-MM-DD` day throws instead
 * of coming back unchanged. For callers where a bad key is a bug, not input —
 * the balance schedule, the reminder days, the departure window. UTC midnight
 * arithmetic, so a DST boundary cannot move a due date: Portugal changing its
 * clocks is not fourteen days becoming thirteen.
 */
export function shiftDays(key: DateKey, days: number): DateKey {
  const date = parseDateKey(key);
  if (!date) throw new Error(`shiftDays: ${key} is not a YYYY-MM-DD date`);
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

/** `2026-08-15` → "Saturday, 15 August 2026" / "sábado, 15 de agosto de 2026". */
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

const DAY_FIRST_RE = /^(\d{1,2})\s*[/.-]\s*(\d{1,2})\s*[/.-]\s*(\d{4})$/;

/**
 * `12/06/2027` → `2027-06-12`. A date that a person typed day first, as the
 * wedding and event forms ask for it (JAM-320).
 *
 * The forms used a native date field, and a browser draws that field in the
 * browser's own language: a browser in US English showed month first on the
 * Portuguese page. The field is now text that the page controls, and this is
 * the one place that reads it. A value that is already a date key passes, so a
 * page that a browser cached with the native field still posts a good date.
 * A day that does not exist (`31/02/2027`) gives `null`.
 */
export function parseDayFirst(value: string): DateKey | null {
  const trimmed = value.trim();
  if (isDateKey(trimmed)) return trimmed;
  const match = DAY_FIRST_RE.exec(trimmed);
  if (!match) return null;
  const key = `${match[3]}-${match[2].padStart(2, "0")}-${match[1].padStart(2, "0")}`;
  return isDateKey(key) ? key : null;
}

/**
 * What the day-first date field shows after each keystroke: the digits of a
 * day, a month and a year, with the slashes put in for the person.
 *
 * The slashes are automatic because the numeric keyboard of a phone has no
 * slash key. A separator typed after one digit closes that part, so `1/6/2027`
 * becomes `01/06/2027`. A slash is added at the end of a full part only while
 * the text grows (`previous` is the text before the keystroke): added on a
 * deletion too, it would come back each time the person deletes it.
 */
export function maskDayFirst(raw: string, previous = ""): string {
  const sizes = [2, 2, 4];
  const parts = ["", "", ""];
  let index = 0;
  for (const char of raw) {
    if (char >= "0" && char <= "9") {
      if (parts[index].length === sizes[index]) {
        if (index === 2) break;
        index += 1;
      }
      parts[index] += char;
    } else if (index < 2 && parts[index].length > 0) {
      parts[index] = parts[index].padStart(2, "0");
      index += 1;
    }
  }
  const growing = raw.length > previous.length;
  let out = parts[0];
  if (index >= 1 || (growing && parts[0].length === 2)) out += "/";
  out += parts[1];
  if (index >= 2 || (growing && index === 1 && parts[1].length === 2)) out += "/";
  return out + parts[2];
}
