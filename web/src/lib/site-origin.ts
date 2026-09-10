/**
 * Where this deployment actually lives — as opposed to where the site will
 * eventually live.
 *
 * Two different questions wear the same shape, and conflating them is how a
 * guest gets a broken image:
 *
 * - **The canonical home** is `site.domain` — `canonicalOrigin()` below. It is
 *   what canonicals, hreflang, the sitemap, `robots.txt` and every JSON-LD
 *   `@id` must say, because that is the address the site is claiming. It
 *   follows `NEXT_PUBLIC_SITE_URL` where production sets it, and otherwise
 *   falls back to `https://agorasim.pt` — never to the Vercel-provided URL,
 *   because a canonical that pointed at whatever host served the request
 *   would invite a crawler to index the preview.
 * - **The origin serving this deployment** is what a link has to use if
 *   somebody is going to click it *today*. Until Diogo & Rita recover the
 *   domain, `agorasim.pt` answers `403` to everyone, so anything resolved
 *   against it — the logo in an email, the footer link — is dead on arrival.
 *
 * `siteUrl()` answers the second question, and it answers it the same way for
 * every caller: Stripe's return URLs, the admin deep-link in the team
 * notification, and the assets and links in both emails. Both answers are
 * deliberately self-healing — the day `NEXT_PUBLIC_SITE_URL` becomes
 * `https://agorasim.pt`, every one of those follows the domain home without a
 * code change, and the two answers converge.
 *
 * No `server-only` marker: this reads environment variables and returns a
 * string, and the checkout form needs the same answer the server has.
 * `NEXT_PUBLIC_SITE_URL` is public by construction; the Vercel variables simply
 * read as absent in a browser bundle, which lands on the same fallback a
 * developer gets.
 */

/** The address the site claims when nothing configures another. */
export const CANONICAL_HOME = "https://agorasim.pt";

/** `NEXT_PUBLIC_SITE_URL`, trimmed and without a trailing slash; `undefined` when unset or blank. */
function configuredOrigin(): string | undefined {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  return configured ? configured.replace(/\/$/, "") : undefined;
}

/**
 * The origin every canonical, hreflang, sitemap URL, `robots.txt` host and
 * JSON-LD `@id` is written against — `site.domain`.
 *
 * `NEXT_PUBLIC_SITE_URL` when set, so the switch to `agorasim.pt` is one env
 * change and a redeploy. Otherwise `CANONICAL_HOME`, and deliberately not the
 * Vercel URL: a preview deployment keeps advertising the production address,
 * so a crawler that stumbles on the preview is pointed home rather than told
 * the preview is the real page.
 */
export function canonicalOrigin(): string {
  return configuredOrigin() ?? CANONICAL_HOME;
}

/**
 * Where Stripe sends the guest back to, where an email's images load from, and
 * where its links point.
 *
 * `NEXT_PUBLIC_SITE_URL` in production; the Vercel-provided URL on a preview
 * deployment, so a preview's checkout returns to that preview rather than to
 * production. Localhost last, which is what a developer gets.
 */
export function siteUrl(): string {
  const configured = configuredOrigin();
  if (configured) return configured;

  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;
  if (vercel) return `https://${vercel}`;

  return "http://localhost:3000";
}

/** `https://agorasim.pt` → `agorasim.pt`, for a link nobody needs to read twice. */
export function siteUrlLabel(origin: string = siteUrl()): string {
  return origin.replace(/^https?:\/\//, "");
}
