# Stub: After the second tap the calendar's range actions are below the fold

- lane: tweak
- found-by: ux lens (/project) · 2026-09-18
- priority: P2

## Problem

`RangeActions` renders after the calendar card; at 375×667 the card alone exceeds the
space between the sticky header and the bottom toolbar, so "Abrir / Fechar período" appears
off-screen with no `role="status"`, no scroll, no focus move — the only feedback is the
stripe (`web/src/components/admin/availability-calendar.tsx:1549-1556,1499`). Admin spec X4.

## Proposed change

Scroll the actions into view and announce the selection on the second tap, or pin the
actions above the toolbar while a range is active.

## Prompt

In the agorasim repo (`web/`), read `.icm/intake/triage/range-actions-below-fold.md` and
make the range actions reachable and announced on a 375px phone in
`src/components/admin/availability-calendar.tsx`. `git mv` the stub to `_done/` in the PR,
on a `claude/` branch; CI is the source of truth.
