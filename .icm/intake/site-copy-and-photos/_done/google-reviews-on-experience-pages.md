# Stub: The experience pages show Agorasim's Google reviews

- feature-slug: google-reviews-on-experience-pages
- epic: site-copy-and-photos
- sequence: 3 of 3
- depends-on: none
- complexity: medium
- priority: P2

## Problem

Reviews on the site are three static quotes, shown on the home page and the Rural Saloia page.
Óbidos, Manzwine and Ramilo Wines show none. Diogo wants to see reviews on the experience page.
Jamie decided a connection that loads Google reviews is enough for now.

## Proposed change

The site loads the business's Google reviews on the server and shows them in the testimonials
section of every experience page: the reviewer's first name, the stars, the text and the date.
The three static quotes stay as a fallback when the connection fails. No script and no cookie
reach the browser.

## Acceptance criteria

- [ ] Every experience page shows the latest Google reviews of the business, with name, stars, text and date, in the language Google returns.
- [ ] The reviews are fetched on the server and cached with the page's hourly revalidation. No request to Google leaves the browser.
- [ ] When the connection fails or returns nothing, the page shows the static testimonials as today.
- [ ] The API key is read from an environment variable, named in `web/.env.example`, never in git.
- [ ] No Review or AggregateRating JSON-LD is emitted.

## Out of scope

- A review wall page, filters, or replies.
- Collecting reviews on the site.

## Notes

- Decisions this stub leaves open. Jamie answers them in the pull request before the build:
  1. The source. Default: Google Places API (New), Place Details, field `reviews`, which returns up to five reviews.
  2. The Place ID. Default: the one behind the review link in `web/src/content/site.ts` lines 30 to 32. Jamie confirms it.
  3. The account that holds the API key. Default: Jamie's Google Cloud project, key named `GOOGLE_PLACES_API_KEY`.
  4. How many reviews to show. Default: up to five, newest first.
- The testimonials component is `web/src/components/testimonials.tsx`, the content `web/src/content/testimonials.ts`, the page `web/src/app/[locale]/experiencias/[slug]/page.tsx` line 174.
