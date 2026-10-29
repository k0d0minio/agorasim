# Stub: The Events page no longer shows the weddings button

- lane: tweak
- found-by: feedback round 1, Diogo, WhatsApp 2026-10-12 (Drive, `feedback-round-1.pdf`) · 2026-10-23
- complexity: low
- priority: P2

## Problem

`/eventos` shows an outline button "Casamentos em carros clássicos" next to the primary
"Pedir orçamento" button (`web/src/app/[locale]/eventos/page.tsx` lines 66 to 71). Diogo wants
it removed from the Events section.

## Proposed change

Remove the button and its hard-coded label. The hero photo of `/eventos` is a wedding photo
(line 75): leave it, the feedback names only the button.

## Acceptance criteria

- [ ] `/eventos` shows no link to `/casamentos` in its hero, in PT and EN.
- [ ] The primary quote button stays.
