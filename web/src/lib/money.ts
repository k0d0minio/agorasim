/**
 * Money: cents in, strings out.
 *
 * Split out of `lib/bookings.ts` — which is `server-only`, because it holds the
 * seat queries — so the checkout form can format a running total in the browser
 * as the guest adds a tasting or a person. Without this file the alternative
 * was passing a formatter function across the server/client boundary, which
 * does not serialize, or shipping a second, subtly different copy of the
 * rounding rules inside the component. Both are worse than one small module
 * that either side may import.
 *
 * **Integer cents, always.** Money in a float is a rounding error waiting for a
 * customer to find it, and cents are the unit Stripe charges in, so the only
 * conversion is here at the display edge.
 */

/** The currency the business sells in. Stripe wants it lowercase. */
export const BOOKING_CURRENCY = "eur";

/**
 * A price as an operator types it → cents. `""` (and anything unreadable)
 * means "no price", which is not the same as zero.
 *
 * Accepts a comma or a dot for the decimal separator, because the people
 * filling this in write "145,50" and their phone keyboard offers whichever it
 * feels like. Rounds to the nearest cent rather than truncating, so a stray
 * third digit costs the guest nothing.
 */
export function parsePriceInput(value: string): number | null {
  const cleaned = value.trim().replace(/\s/g, "").replace(",", ".");
  if (!cleaned) return null;
  if (!/^\d+(\.\d{1,3})?$/.test(cleaned)) return null;

  const cents = Math.round(Number(cleaned) * 100);
  return Number.isFinite(cents) && cents > 0 ? cents : null;
}

/** Cents → the string the price field is pre-filled with ("145" / "145.50"). */
export function priceInputValue(cents: number | null | undefined): string {
  if (typeof cents !== "number" || cents <= 0) return "";
  return cents % 100 === 0 ? String(cents / 100) : (cents / 100).toFixed(2);
}

/** `14500` → "€145" / "€145,50" — trailing cents only when there are any. */
export function formatPrice(
  cents: number,
  locale: "pt" | "en",
  currency: string = BOOKING_CURRENCY,
): string {
  return new Intl.NumberFormat(locale === "pt" ? "pt-PT" : "en-GB", {
    style: "currency",
    currency: currency.toUpperCase(),
    // A tour priced in whole euros should read "€145", not "€145.00"; one
    // priced at €145.50 must not silently round to €146.
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}
