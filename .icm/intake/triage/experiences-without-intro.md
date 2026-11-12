# Stub: The Experiences page goes straight to the experiences

- lane: tweak
- found-by: feedback round 2 ("remove the experience initial text") · 2026-11-12
- complexity: low
- priority: P2

## Problem

`/experiencias` opens with a title and a lead paragraph ("Passeios guiados em carro clássico pela
região Saloia…") before the list (`web/src/app/[locale]/experiencias/page.tsx`, text in
`web/src/content/pages.ts` `experiences.lead`). Diogo and Rita want the page to start with the
experiences.

## Proposed change

Remove the lead paragraph in PT and EN. Keep the title "Experiências" / "Experiences" as the
page's one heading.

## Acceptance criteria

- [ ] `/pt/experiencias` and `/en/experiencias` show the title and then the first experience, with no lead paragraph.
- [ ] The page keeps one `h1`.
- [ ] The page's meta description stays filled.

## Notes

- Check whether `experiences.lead` also feeds the meta description or the JSON-LD before removing it.
