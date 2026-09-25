# Tweak: quote-link-404-status

- change: `web/src/proxy.ts`: does the quote-link digest lookup (its own throttle budget)
  ahead of rendering and rewrites a dead link's token to `DEAD_QUOTE_TOKEN`
  (`web/src/lib/quote-token.ts`) before `[token]/page.tsx` ever streams; the page throws
  `notFound()` on the sentinel before any `await`, and the new
  `web/src/app/[locale]/orcamento/[token]/not-found.tsx` (bilingual — `not-found.tsx` gets
  no route params) answers with a real 404, using the page's own "no longer valid" wording →
  a dead quote link now answers 404 instead of a `noindex` 200.
- changelog: announce: none (this repo keeps no changelog page)
- learned: none
