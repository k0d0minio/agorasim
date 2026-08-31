import type { Locale } from "@/i18n/config";

/** Format an ISO post date ("2026-07-14") for display in the given locale. */
export function formatPostDate(iso: string, locale: Locale): string {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString(
    locale === "pt" ? "pt-PT" : "en-GB",
    { day: "numeric", month: "long", year: "numeric" },
  );
}

/**
 * Words a reader gets through in a minute. The usual figure for adult prose in
 * a Romance or Germanic language is 200–250; the low end is the honest one for
 * a page read on a phone, half-planning a holiday.
 */
const WORDS_PER_MINUTE = 200;

/**
 * How long the article takes to read, in whole minutes, never zero.
 *
 * Derived rather than stored. A reading time an author types is a number that
 * goes stale the first time a paragraph is cut, and there is nothing an editor
 * could tell us here that counting the words does not.
 */
export function readingMinutes(paragraphs: string[]): number {
  const words = paragraphs.reduce(
    (total, paragraph) => total + paragraph.split(/\s+/).filter(Boolean).length,
    0,
  );
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
}

/**
 * An ISO date (`2026-07-14`) from a timestamp or a `date` column.
 *
 * The `date` columns come back from the driver as `YYYY-MM-DD` strings and the
 * timestamps as `Date`s; both end up in the same places (a card, a JSON-LD
 * field), so the narrowing happens once, here. `null` for anything unreadable —
 * a missing date renders as no date, and never as "Invalid Date".
 */
export function isoDate(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  if (typeof value === "string") {
    return /^\d{4}-\d{2}-\d{2}/.test(value) ? value.slice(0, 10) : null;
  }
  return Number.isNaN(value.getTime()) ? null : value.toISOString().slice(0, 10);
}
