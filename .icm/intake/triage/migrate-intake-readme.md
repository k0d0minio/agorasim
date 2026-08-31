# Stub: The intake contract still teaches the retired AGORA-NNN format

- lane: chore
- found-by: ticket-scout · 2026-08-29; re-confirmed still live 2026-08-31
- priority: P1
- size: S
- sources: `.icm/intake/README.md` (commit 58a341b, pre-rework — still specifies
  `AGORA-NNN-slug.md`, a `Status` row and a flat folder) against the epics-and-stubs
  shape every one of the eleven live epics actually uses

## Problem

`.icm/intake/README.md` (last touched pre-rework, commit 58a341b) documents the
retired flat `AGORA-NNN` ticket contract: numbered filenames, a metadata table, a
`Status` row that is flipped rather than a folder that is moved, and one flat
directory. None of that is how this repo works — eleven epic folders, path identity,
`sequence`/`depends-on` dash-lines and positional status. Anyone cutting tickets from
the README will recreate the purged shape, and the README is the first thing they are
told to read (`AGENTS.md` routes ticket work to "`.icm/intake/` — contract in its
`README.md`").

Raised to P1 on 2026-08-31: it is small, it is the one file whose wrongness
propagates into every future ticket, and the 2026-08-31 triage had to work around it.
The estate's canonical micro-copy lives in `_system/template/` in the icm-board repo.

## Proposed change

Replace it with the current epics/stubs micro-copy (source: icm-board
`_system/contracts/TICKETS.md`, seeded template in `_system/template/icm/`), or
re-run `icm-check.sh --fix` from icm-board and hand-adjust if the seeder won't
overwrite (it never overwrites — so a manual replace is expected).

## Prompt

In the agorasim repo, replace `.icm/intake/README.md` with the current estate intake
contract micro-copy. Preferred source, if the session can reach the icm-board
checkout: `/home/jamie-nisbet/Apps/_system/contracts/TICKETS.md` plus the template
copy under `/home/jamie-nisbet/Apps/_system/template/`. If it cannot (a remote
session, say), the same contract is carried in-repo by
`.claude/skills/ticket-craft/SKILL.md` — write the README from that instead rather
than skipping the ticket. Either way the result is the self-contained README the
template prescribes: epics + stubs + triage, path identity, positional status, the
required dash-lines, and the "`## Prompt` stands alone" rule. Check it against what
`.icm/intake/` actually contains before committing. Ticket-only commit straight to
main per repo conventions.
