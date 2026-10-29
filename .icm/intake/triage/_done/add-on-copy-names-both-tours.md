# Stub: The add-on descriptions and FAQs name both tours, not Rural Saloia only

- lane: tweak
- found-by: build of `add-ons-on-the-site/obidos-add-ons-with-duration` · 2026-10-28
- complexity: low
- priority: P2

## Problem

The add-ons now join a private departure of Rural Saloia or of Óbidos & Medieval Villages. The
catalogue prose still names Rural Saloia only, in PT and EN:

- Tasco Galapito summary: "combina na perfeição com a experiência Rural Saloia".
- Manzwine FAQ answer: "a prova junta-se à experiência privada Rural Saloia".
- Ramilo Wines FAQ answer: "como complemento da experiência privada Rural Saloia".

The live text is in the `experiences` table. The admin edits it at `/admin/experiences`. The
shipped fallback in `web/src/content/experiences.ts` holds the same text. The home intro
`experiencesIntro` in `web/src/content/pages.ts` says "Comece pelo passeio Rural Saloia e
complemente-o".

## Proposed change

Ask Diogo for the new PT and EN text. He edits the three entries at `/admin/experiences`. Copy
the same text into the shipped fallback and `experiencesIntro`.

## Acceptance criteria

- [ ] The summary and FAQs of Tasco Galapito, Manzwine and Ramilo Wines name the tours each add-on joins, in PT and EN.
- [ ] `web/src/content/experiences.ts` holds the same text as the live catalogue.
- [ ] The home intro does not say that add-ons join Rural Saloia only.
