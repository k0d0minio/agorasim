/**
 * A quote's arithmetic, pure and safe on either side of the wire.
 *
 * `lib/quotes.ts` is `server-only` — it holds the database — but the quote
 * builder on the Sales detail has to show Rita the total, the deposit, the
 * balance and its due date *as she types*, before anything is saved. Those
 * numbers must be the very ones the server will write, so the functions that
 * produce them live here once, with no imports, and `lib/quotes.ts` re-exports
 * them. A second copy in the browser would be a preview that disagrees with the
 * quote the couple receives the first time either is touched.
 */

/** The share taken up front to hold the date (proposal §5). */
export const DEFAULT_DEPOSIT_PERCENT = 30;

/**
 * How many days before the event the balance falls due — the proposal's
 * "collected by a second automatic payment link 14 days before".
 */
export const BALANCE_DUE_DAYS_BEFORE = 14;

/** What the two instalments come to. Always sums to the total, exactly. */
export type QuoteSplit = { depositCents: number; balanceCents: number };

/**
 * Split a total into the deposit that holds the date and the balance that
 * follows.
 *
 * The deposit rounds to the nearest cent and **the balance is the remainder**,
 * never its own percentage of the total. Take 30% of €1,235 twice and the two
 * halves come to a cent less than the whole; taking one and subtracting cannot,
 * whatever the percentage or the total. A guest who pays both instalments has
 * paid the quote, and this is what makes that arithmetically true rather than
 * usually true.
 *
 * Throws on anything that is not a whole number of cents or a percentage
 * between 1 and 100, in the shape `commissionOn` refuses a non-integer basis:
 * a plausible figure computed from a bad input is worse than a stack trace,
 * because the guest is charged it.
 */
export function splitTotal(
  totalCents: number,
  depositPercent: number = DEFAULT_DEPOSIT_PERCENT,
): QuoteSplit {
  if (!Number.isSafeInteger(totalCents) || totalCents <= 0) {
    throw new Error(
      `splitTotal: ${totalCents} is not a positive whole number of cents — money is integers here`,
    );
  }
  if (!Number.isInteger(depositPercent) || depositPercent < 1 || depositPercent > 100) {
    throw new Error(`splitTotal: ${depositPercent}% is not a deposit share between 1 and 100`);
  }

  const depositCents = Math.round((totalCents * depositPercent) / 100);
  return { depositCents, balanceCents: totalCents - depositCents };
}

/** One priced line, in the shape `quotes.line_items` stores. */
export type QuoteLine = { label: string; unitCents: number; quantity: number };

/** What the lines add up to. `0` for a quote that is a single agreed figure. */
export function lineItemsTotal(items: readonly QuoteLine[]): number {
  return items.reduce((sum, item) => sum + item.unitCents * item.quantity, 0);
}

const DATE_KEY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * When the balance falls due for an event on this day — T−14, as a
 * `YYYY-MM-DD` key — or `null` for anything that is not a calendar day.
 *
 * UTC midnight arithmetic, the same as `shiftDays` in `lib/quotes.ts`, so a
 * DST boundary cannot move a due date. `null` rather than a throw because the
 * builder calls this on every keystroke of a half-typed date.
 */
export function balanceDueKey(eventDate: string): string | null {
  const match = DATE_KEY_RE.exec(eventDate);
  if (!match) return null;
  const [year, month, day] = match.slice(1).map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  // `2026-02-31` rolls into March and stops being the day it was asked for.
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  const due = new Date(date.getTime() - BALANCE_DUE_DAYS_BEFORE * 86_400_000);
  return due.toISOString().slice(0, 10);
}
