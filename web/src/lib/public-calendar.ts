/**
 * The public picker's arithmetic — what `/reservar`'s calendar decides without
 * a round trip, kept out of the component so it can be tested.
 *
 * Client-safe: it imports only types from `lib/availability.ts` (which is
 * `server-only`) and the day arithmetic from `lib/date-keys.ts`.
 */
import { tourRequestContent } from "@/content/tour-request";
import { t, type Locale } from "@/i18n/config";
import type { PublicMonth } from "@/lib/availability";
import { firstOnlineDay, parseDateKey, type DateKey } from "@/lib/date-keys";
import { noVehicles } from "@/lib/fleet";

/**
 * The payload as it stands *today*, in the browser.
 *
 * `/reservar` is prerendered and revalidated hourly, so just after midnight
 * the months it carries were described yesterday — and offer a day that is
 * now tomorrow, which the server will refuse (D-3). This takes every day
 * before the first online day off sale, exactly as `toPublicDay` writes a day
 * that is off sale: no drivers, no cars, not bookable.
 *
 * It only ever removes. A browser clock that is wrong can cost the guest a
 * day the server would have sold; it can never offer one the server refuses.
 * Returns the same array when nothing changes, so it is cheap to run on every
 * render.
 */
export function applyOnlineNotice(months: PublicMonth[], today: DateKey): PublicMonth[] {
  const first = firstOnlineDay(today);
  let changed = false;

  const next = months.map((month) => {
    if (!month.days.some((day) => day.date < first && day.bookable)) return month;
    changed = true;
    const days = month.days.map((day) =>
      day.date < first && day.bookable
        ? {
            ...day,
            bookable: false,
            slots: day.slots.map((slot) => ({
              ...slot,
              driversLeft: 0,
              vehiclesLeft: noVehicles(),
            })),
          }
        : day,
    );
    return { ...month, days, hasOpenings: days.some((day) => day.bookable) };
  });

  return changed ? next : months;
}

/**
 * Which months a two-month view shows when `index` is the month in focus.
 *
 * The pair starts at the month in focus, except at the end of the window,
 * where it is the last two months rather than the last month and a blank —
 * so the pager's last stop on a laptop is one press earlier than on a phone.
 * `second` is null only when there is a single month to show.
 */
export function monthPair(
  index: number,
  total: number,
): { first: number; second: number | null } {
  if (total <= 1) return { first: 0, second: null };
  const first = Math.max(0, Math.min(index, total - 2));
  return { first, second: first + 1 };
}

/**
 * "Quarta, 14 de outubro" / "Wednesday, 14 October" — the day half of the
 * summary line under the calendar. No year: the picker never reaches past six
 * months, so the month already says which one.
 *
 * The key is read as a UTC midnight so the day never shifts under a browser
 * timezone, as everywhere else a key is formatted.
 */
export function summaryDay(key: DateKey, locale: Locale): string {
  const date = parseDateKey(key);
  if (!date) return key;
  const weekday = t(tourRequestContent.calendar.weekdayNames, locale)[(date.getUTCDay() + 6) % 7];
  const month = new Intl.DateTimeFormat(locale === "pt" ? "pt-PT" : "en-GB", {
    month: "long",
    timeZone: "UTC",
  }).format(date);
  const day = date.getUTCDate();
  return locale === "pt" ? `${weekday}, ${day} de ${month}` : `${weekday}, ${day} ${month}`;
}

/**
 * The whole summary line: the day, then the departure when one is chosen —
 * "Quarta, 14 de outubro · 10h00". The enquiry form, and a checkout whose
 * guest has not picked a time yet, get the day alone.
 */
export function summaryLine(key: DateKey, locale: Locale, time?: string | null): string {
  const day = summaryDay(key, locale);
  return time ? `${day} · ${time}` : day;
}
