# Stub: The About page shows Diogo and Rita, and the four classic cars

- feature-slug: about-page-hosts-and-cars
- epic: site-copy-and-photos
- sequence: 2 of 3
- depends-on: none
- complexity: medium
- priority: P1

## Problem

`/sobre` has a title, a lead, one photo of guests under an olive tree, two paragraphs and three
value cards. No hosts, no cars. Diogo wants a photo of the two of them together and photos of the
different classic cars, as the old site had.

## Proposed change

The About page gains two sections. "Quem somos": a photo of Diogo and Rita with a short text.
"Os nossos clássicos": one tile per car (Citroën 2CV, Renault 4L, Fiat 600, Volkswagen T3) with a
photo, the model, the year and the one-sentence story the site already holds.

## Acceptance criteria

- [ ] `/sobre` shows a hosts section with a photo of Diogo and Rita and a short text, in PT and EN.
- [ ] `/sobre` shows a cars section with four tiles: photo, model, year, story, from `classicCars` in `web/src/content/site.ts`.
- [ ] The car photos come from the committed files under `public/images/fleet/`.
- [ ] Every image has an alt text in PT and EN.
- [ ] The page holds at 320 px width and no photo is cropped through a face.

## Out of scope

- A team page or staff bios beyond the two of them.
- Changes to the home page cars strip.

## Notes

- Decisions this stub leaves open. Jamie answers them in the pull request before the build:
  1. The photo of Diogo and Rita. The repo holds none of only the two of them. Default: Diogo sends one landscape photo over WhatsApp. The cars section ships first, the hosts section when the photo lands.
  2. The hosts text. Default: the two paragraphs already on the page, under the new heading.
- Ten photos under `public/images/fleet/` are referenced nowhere: `citroen-2cv-agorasim-lettering`, `citroen-2cv-country-road-backlit`, `citroen-2cv-country-road-rear`, `fiat-600-countryside`, `renault-4-and-fiat-600-village-square`, `renault-4-bougainvillea-lane`, `renault-4-village-house`, `vw-t3-van-and-2cv-vineyard-road`, `vw-t3-van-doors-open`, `vw-t3-van-front`.
- Files: `web/src/app/[locale]/sobre/page.tsx`, `web/src/content/pages.ts` lines 58 to 86, `web/src/content/site.ts` lines 65 to 106.
