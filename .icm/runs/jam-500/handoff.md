# Handoff jam-500

## Next action

The operator tests the preview and ticks **Ready to merge**. Then `release JAM-500`.

## What changed

- `web/src/lib/legacy-redirects.ts` has twelve new permanent redirects (308).
- The three old tour pages go to `/<locale>/experiencias/rural-saloia`.
- `/home-agorasim` and `/home-teste` go to `/pt`. `/en/home-agorasim` goes to `/en`.
- `/en/politica-de-privacidade` and `/en/politica-de-cookies` go to `/en/privacy`.
- `/en/centro-de-arbitragem` goes to `/en/contactos`. This is the same as the existing
  rule for `/centro-de-arbitragem`. The ticket groups it with the policies. The contact
  page is the page where a dispute starts.
- The test holds each destination to a served route in its locale, the experience pages
  included. It also refuses a source that is a served page.
- No served page changes. Only URLs that answered 404 now redirect.

## How to test

On the preview, open `/en/rural-oeste/`. You must arrive on the English Rural Saloia page.
Open `/home-teste`. You must arrive on the Portuguese home page.

## Blockers

- none

## Do not touch

- none
