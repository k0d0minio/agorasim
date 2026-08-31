# Stub: The dashboard repeats the navigation instead of saying what needs attention

- lane: tweak
- found-by: admin-audit harvest (PR #6 `docs/admin-audit-2026-07.md` §3.5) · 2026-08-31
- priority: P2
- size: S

## Problem

`web/src/app/admin/page.tsx` is four stat tiles over a grid of area cards — one card
per entry in `adminAreas()`, which is exactly what the sidebar and the bottom
toolbar already render. On a phone that is a single column of links to screens the
nav reaches in one tap, several of them still in development.

The tiles don't work either: "New leads: 3" is a number with a hint and no
destination, so the operator reads it, then navigates to the board and finds the
three cards by eye. Nothing on the screen names *which* lead is waiting, how long it
has been waiting, or what is overdue — and the data for all three is already loaded
one query away (`lastContactedAt`, `createdAt`, the per-status counts the page
already computes).

## Proposed change

Turn the first screen into the day's worklist: the stat tiles become links into a
filtered board (`/admin/sales?stage=new`), and under them a short list of the oldest
uncontacted leads with a relative age (`formatRelativeTime` exists) and their quick
actions. Keep one compact areas grid below for the things the list can't cover —
this is a reordering of what the page already knows, not a new data source.
Portuguese strings (D4). Depends on the stage/search params landing (see
`sales-board-search.md`) if the tiles are to deep-link into a filtered board.

## Prompt

In the agorasim repo (`web/`), rework the admin dashboard per
`.icm/intake/triage/admin-dashboard-what-needs-me.md`: in
`web/src/app/admin/page.tsx`, make the four stat tiles link into their filtered
destination, add a "needs you today" list of the oldest uncontacted leads (relative
ages via `formatRelativeTime`, the same quick actions as a board card), and demote
the areas grid so it no longer duplicates the nav above the fold. Check first
whether `sales-board-search.md` has landed a stage/query param to link into; if not,
link to the plain board and note it. Portuguese strings — the admin is PT (D4 in
`.icm/project.md`). PR on a `claude/` branch; no local checks — CI is the source of
truth.
