/**
 * The old WordPress site's URL map, 301'd onto the new routes.
 *
 * agorasim.pt serves a WordPress site until the cutover — the day the registrar
 * transfer lands and the nameservers move (register decision D18). Its
 * navigation is small and locale-less — Portuguese paths at the root — and
 * every inbound link, search result and Instagram bio points at one of them.
 * The moment DNS moves, each would otherwise be a 404, and a soft one at that:
 * `app/[locale]` would take `sobre` for a locale and `notFound()` it.
 *
 * Destinations are written out rather than derived from `routes.ts`, because
 * `next.config.ts` imports this module and the config is loaded outside the
 * app's `@/` alias, so it must not pull the route map in. The test alongside
 * holds every destination to a path the route map actually serves.
 *
 * Trailing-slash variants (`/sobre/`, which WordPress canonicalised to) are not
 * listed: Next's own trailing-slash redirect runs ahead of these and strips the
 * slash with a 308, so `/sobre/` reaches `/pt/sobre` in two hops rather than
 * needing a second source apiece.
 *
 * `/en` is deliberately absent — it already resolves as the English home
 * (`app/[locale]/page.tsx`). The WordPress machinery paths (`/feed`,
 * `/wp-json`, …) are not redirects either; they answer 410 from
 * `lib/gone.ts`, because there is nothing to send their traffic to.
 */
export type LegacyRedirect = {
  source: string;
  destination: string;
  permanent: true;
};

export const LEGACY_REDIRECTS: LegacyRedirect[] = [
  { source: "/sobre", destination: "/pt/sobre", permanent: true },
  { source: "/contactos", destination: "/pt/contactos", permanent: true },
  { source: "/eventos", destination: "/pt/eventos", permanent: true },

  // The two policies collapse into the single privacy page.
  { source: "/politica-de-privacidade", destination: "/pt/privacidade", permanent: true },
  { source: "/politica-de-cookies", destination: "/pt/privacidade", permanent: true },

  // The ADR (RAL) entity moves to the site footer (see the launch-cutover
  // epic's `footer-compliance`); the contact page is where a dispute starts.
  { source: "/centro-de-arbitragem", destination: "/pt/contactos", permanent: true },
];
