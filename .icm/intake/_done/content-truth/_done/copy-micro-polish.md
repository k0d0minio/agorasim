# Stub: Voice consistency tail — the small copy fixes

- feature-slug: copy-micro-polish
- epic: content-truth
- priority: P2
- size: S
- depends-on: purge-olaria-refresh-llms
- sequence: 7 of 7
- sources: copy lens 2026-08-29 (each with file:line)

## Problem

Small inconsistencies that read as carelessness once real guests arrive: PT hero CTA
is a noun ("Reservas") where EN is imperative ("Book now"); nav sells a "tour" where
every page sells an "experience"; EN copy says "team buildings" (a Portuguese-ism);
`web/src/content/pages.ts:80`.

## Proposed change

Fix the CTA to imperative PT ("Reserve agora" or "Reservar"), unify tour→experience
in nav strings, replace "team buildings" with "team-building days". One sweep of
`dictionaries.ts` + `pages.ts` for further EN/PT register drift while in there.

## Acceptance criteria (rough)

- [ ] The three named fixes done; PT/EN registers match
- [ ] CI green

## Prompt

In the agorasim repo (`web/`), apply the copy micro-polish in
`.icm/intake/content-truth/copy-micro-polish.md`: `web/src/i18n/dictionaries.ts`
lines ~48-89 (PT CTA imperative, tour→experience) and `web/src/content/pages.ts:80`
("team buildings" → "team-building days"), plus any drift found in the same files.
Keep both locales natural, not literal. PR on a `claude/` branch; no local checks —
CI is the source of truth.
