# Stub: intake/README.md still teaches the retired AGORA-NNN format

- lane: chore
- found-by: ticket-scout · 2026-08-29
- priority: P2

## Problem

`.icm/intake/README.md` (last touched pre-rework, commit 58a341b) documents the
retired flat `AGORA-NNN` ticket contract. Anyone cutting tickets from it will
recreate the purged shape. The estate's canonical micro-copy lives in
`_system/template/` in the icm-board repo.

## Proposed change

Replace it with the current epics/stubs micro-copy (source: icm-board
`_system/contracts/TICKETS.md`, seeded template in `_system/template/icm/`), or
re-run `icm-check.sh --fix` from icm-board and hand-adjust if the seeder won't
overwrite (it never overwrites — so a manual replace is expected).

## Prompt

In the agorasim repo, replace `.icm/intake/README.md` with the current estate
intake contract micro-copy: read
`/home/jamie-nisbet/Apps/_system/contracts/TICKETS.md` and the template copy under
`/home/jamie-nisbet/Apps/_system/template/`, adapt the self-contained README the
template prescribes (epics + stubs + triage, path identity, positional status), and
commit as a ticket-only commit straight to main per repo conventions.
