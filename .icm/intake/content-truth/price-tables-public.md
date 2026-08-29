# Stub: Real prices on the experience pages, and in the structured data

- feature-slug: price-tables-public
- epic: content-truth
- priority: P1
- size: M
- depends-on: none
- sequence: 3 of 7
- sources: D8 (2026-08-29); product lens ("a guest cannot learn a price without entering checkout"; `fromPrice()` referenced only by its own tests; no Offer in `web/src/lib/jsonld.ts`); prices.pdf

## Problem

No public page shows a price. The real model (public per-person vs private group
tiers, children/infant bands, add-on prices with minimums) exists in the catalogue
and renders nowhere; GEO's answer-first principle wants the price in the answer.

## Proposed change

A pricing section on each experience page rendering its catalogue pricing: public
per-person rates (adult/child/infant), the private tier table, and — Countryside
only — the add-ons with their prices, minimums, and the Manzwine Monday note. Cards
on the experiences index get an honest "desde X€ / from €X" via `fromPrice()`.
JSON-LD gains `offers` (low/high price range per tour, EUR). Tables must read on a
phone (the private table is 12 rows — collapse or scroll within its own container).

## Acceptance criteria (rough)

- [ ] Each experience page shows its real prices; index cards show from-prices
- [ ] Add-on gating (private-only) and minimums stated in words
- [ ] JSON-LD offers present and matching the tables; PT/EN; CI green

## Prompt

In the agorasim repo (`web/`), publish the price tables per
`.icm/intake/content-truth/price-tables-public.md`: a pricing section on
`web/src/app/[locale]/experiencias/[slug]/page.tsx` rendering the entry's
`pricing` (types in `web/src/lib/pricing.ts`; catalogue via
`web/src/lib/experience-catalogue.ts` — requires the pricing-mapping fix from
booking-live to be merged), `fromPrice()` on the index cards, and `offers` in
`web/src/lib/jsonld.ts`. Verify rendered numbers against `.icm/docs/prices.pdf`.
Mobile-legible tables, PT/EN in sync. PR on a `claude/` branch; no local checks — CI
is the source of truth.
