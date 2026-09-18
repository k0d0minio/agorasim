# Stub: llms.txt predates the weddings and events doors and the terms page

- lane: tweak
- found-by: copy lens (/project) · 2026-09-18
- priority: P2

## Problem

`web/public/llms.txt` was written for #46; it says nothing about weddings or events (the 6%
side) and its Pages list omits `/casamentos` and `/terms` although both are in `liveKeys`
(`web/src/lib/routes.ts:79-89`). Static, so it cannot follow `NEXT_PUBLIC_SITE_URL` — fine,
it already says agorasim.pt.

## Proposed change

Add the two doors and the terms page; a line on weddings/events in the business summary.

## Prompt

In the agorasim repo (`web/`), read `.icm/intake/triage/llms-txt-two-doors.md` and update
`public/llms.txt` from the live routes and `workspaces/_config/business-facts.md`. `git mv`
the stub to `_done/` in the PR, on a `claude/` branch; CI is the source of truth.
