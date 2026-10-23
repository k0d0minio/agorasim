# Stub: The home page shows the tours first and the add-ons in their own section

- feature-slug: home-add-ons-section
- epic: add-ons-on-the-site
- sequence: 1 of 2
- depends-on: none
- complexity: low
- priority: P1

## Problem

The home page lists Rural Saloia, Óbidos, Tasco Galapito, Manzwine and Ramilo Wines in one grid
of identical cards. Only the price line differs. Diogo says guests cannot tell a tour from an
add-on.

## Proposed change

The home page shows the two tours in the experiences section. The add-ons move to a second
section under it, with the heading `/experiencias` already uses: "Complemente a sua experiência"
and "Extras à sua medida".

## Acceptance criteria

- [ ] The home experiences grid shows only experiences of kind `signature`.
- [ ] A second section shows the experiences of kind `complement`, with the eyebrow "Complemente a sua experiência" and the title "Extras à sua medida", in PT and EN.
- [ ] The add-on cards keep their "+{price} por adulto" price line.
- [ ] The layout holds at 320 px width.

## Out of scope

- The `/experiencias` page, which already separates them.

## Notes

- `web/src/app/[locale]/page.tsx` lines 97 to 110 render one grid from `listExperiences()`. `signatureOf` and `complementsOf` in `web/src/lib/experience-catalogue.ts` lines 202 to 209 give the split. The intro copy is in `web/src/content/pages.ts` lines 33 to 41.
