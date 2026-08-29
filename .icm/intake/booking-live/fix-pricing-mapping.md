# Stub: Map `pricing` through the catalogue resolver — checkout renders again

- feature-slug: fix-pricing-mapping
- epic: booking-live
- priority: P1
- size: S
- depends-on: none
- sequence: 2 of 8
- sources: 2026-08-29 code map: `web/src/lib/experience-catalogue.ts:41-61` (`toEntry()` maps every column except `pricing`); `web/drizzle/0012_real_prices_two_tours.sql` (real prices already seeded)

## Problem

`toEntry()` omits the `pricing` column, so whenever the `experiences` table has rows,
`listCatalogue()` returns entries with `pricing === undefined`. `reservar/page.tsx`
filters on `isPriced(entry.pricing)` → zero priced tours → the checkout form never
renders and every guest falls back to the enquiry form. The real prices sit unused in
the database. This one omission disables the entire paid-booking feature in
production. Secondary symptom of the same gap: the admin experiences list shows no
pricing summary per row (the detail page reads the column directly and works).

## Proposed change

Map `pricing` in `toEntry()` (validated against the `ExperiencePricing` type — treat a
malformed JSON value as unpriced, not a crash), and surface the pricing summary on the
admin experiences list rows. Add a regression test: a catalogue read over a seeded row
must yield a priced entry, and `/reservar` must render the checkout branch.

## Acceptance criteria (rough)

- [ ] `/pt/reservar` renders the checkout form with both tours priced from DB rows
- [ ] Admin experiences list shows each row's pricing summary
- [ ] Malformed pricing JSON degrades to unpriced (enquiry fallback), no crash
- [ ] CI green

## Prompt

In the agorasim repo (`web/`): `toEntry()` in `web/src/lib/experience-catalogue.ts`
maps every experiences column except `pricing`, which makes `isPriced()` false for
every DB-backed entry and permanently disables the paid checkout on
`/[locale]/reservar` (guests only ever see the enquiry fallback). Real pricing JSON is
already seeded by `web/drizzle/0012_real_prices_two_tours.sql`. Fix the mapping with
validation, surface a pricing summary on `web/src/app/admin/experiences/page.tsx` list
rows (the detail page already reads `row.pricing`), and add a regression test. Read
`.icm/intake/booking-live/fix-pricing-mapping.md` for context. Open a PR on a
`claude/` branch; do not run local checks — CI is the source of truth.
