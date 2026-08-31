/**
 * Where this deployment actually lives — as opposed to where the site will
 * eventually live.
 *
 * Two different questions wear the same shape, and conflating them is how a
 * guest gets a broken image:
 *
 * - **The canonical home** is `site.domain` (`https://agorasim.pt`). It is what
 *   canonicals, hreflang, the sitemap, `robots.txt` and every JSON-LD `@id`
 *   must say, because that is the address the site is claiming — and a
 *   canonical that pointed at whatever host served the request would invite a
 *   crawler to index the preview.
 * - **The origin serving this deployment** is what a link has to use if
 *   somebody is going to click it *today*. Until Diogo & Rita recover the
 *   domain, `agorasim.pt` answers `403` to everyone, so anything resolved
 *   against it — the logo in an email, the footer link — is dead on arrival.
 *
 * This module answers the second question, and it answers it the same way for
 * every caller: Stripe's return URLs, the admin deep-link in the team
 * notification, and the assets and links in both emails. It is deliberately
 * self-healing — the day `NEXT_PUBLIC_SITE_URL` becomes `https://agorasim.pt`,
 * every one of those follows the domain home without a code change.
 *
 * No `server-only` marker: this reads environment variables and returns a
 * string, and the checkout form needs the same answer the server has.
 * `NEXT_PUBLIC_SITE_URL` is public by construction; the Vercel variables simply
 * read as absent in a browser bundle, which lands on the same fallback a
 * developer gets.
 */

/**
 * Where Stripe sends the guest back to, where an email's images load from, and
 * where its links point.
 *
 * `NEXT_PUBLIC_SITE_URL` in production; the Vercel-provided URL on a preview
 * deployment, so a preview's checkout returns to that preview rather than to
 * production. Localhost last, which is what a developer gets.
 */
export function siteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");

  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;
  if (vercel) return `https://${vercel}`;

  return "http://localhost:3000";
}

/** `https://agorasim.pt` → `agorasim.pt`, for a link nobody needs to read twice. */
export function siteUrlLabel(origin: string = siteUrl()): string {
  return origin.replace(/^https?:\/\//, "");
}
