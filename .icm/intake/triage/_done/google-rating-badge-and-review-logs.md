# Stub: The experience pages show Agorasim's Google rating, and the log names each review fallback

- lane: tweak
- found-by: UAT check of #220, Google returned no review text · 2026-10-28
- complexity: low
- priority: P1

## Problem

Places API (New) returns the rating (5) and the count (71) for the place, but no review text. The place is a service-area business. So the experience pages show the static quotes, and no Google proof shows. The fallback also writes no log line when the key, the Place ID or the review text is missing. Files: `web/src/lib/google-reviews.ts`, `web/src/components/google-reviews.tsx`, `web/src/components/testimonials.tsx`, `web/src/app/[locale]/experiencias/[slug]/page.tsx`.

## Proposed change

Show a link with the stars, the rating and the count of Google reviews on every experience page. Log one line for each silent fallback.

## Acceptance criteria

- [ ] Every experience page shows "★ 5,0 · 71 avaliações no Google" (EN: "5.0 · 71 Google reviews"), with the live values, linked to the business on Google Maps.
- [ ] The static quotes stay where they show today. The rating link shows also on the pages without quotes.
- [ ] The link shows no rating when Google returns no rating or a count of 0.
- [ ] The server log has one line when the key is missing, when the Place ID is missing, and when Google returns no review text.
- [ ] No `Review` or `AggregateRating` JSON-LD is emitted.
