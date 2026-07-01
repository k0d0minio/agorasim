/**
 * FareHarbor booking integration.
 *
 * Booking today happens through FareHarbor (the same provider the live site uses).
 * Set the shortname via NEXT_PUBLIC_FAREHARBOR_SHORTNAME to activate the lightbox.
 * Until it is configured, booking CTAs fall back to the contact page.
 *
 * The lightbox is enabled by loading FareHarbor's embed script (see
 * components/fareharbor-script.tsx) and pointing links at an /embeds/book URL.
 */

export const FAREHARBOR_SHORTNAME = process.env.NEXT_PUBLIC_FAREHARBOR_SHORTNAME ?? "";

export const fareharborConfigured = FAREHARBOR_SHORTNAME.length > 0;

/**
 * Build a FareHarbor booking URL. When an item id is provided it links to that
 * item; otherwise it links to the company's full item list.
 */
export function fareharborUrl(item?: string | null): string {
  if (!fareharborConfigured) return "";
  const base = `https://fareharbor.com/embeds/book/${FAREHARBOR_SHORTNAME}/`;
  const path = item ? `items/${item}/?full-items=yes&flow=no` : `items/?full-items=yes&flow=no`;
  return base + path;
}
