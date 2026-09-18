# Intake — Agorasim tickets

Open work for this repo lives here as **epics and stubs**; the working contract is the
`ticket-craft` skill (`.claude/skills/ticket-craft/SKILL.md`), canonical spec
`_system/contracts/TICKETS.md` in icm-board. This file is its micro-copy.

## Shape

- **Epic** = `<epic-slug>/` with a `breakdown.md` (what was understood + `## Build order`)
  and one stub per unit of work. Every stub carries `- feature-slug:` (= filename),
  `- sequence: <n> of <m>`, `- depends-on: none | <in-epic slugs sequenced earlier>`.
- **Triage** = `triage/<slug>.md` for one-off findings, with `- lane: bug | tweak | chore`
  and `- found-by:`.
- **Identity is the path** (`<epic>/<slug>`); H1 is `# Stub: <title>`. No numbers.
- Optional dash-lines: `- priority: P0|P1|P2`, `- size:`, `- blocked: <reason>`,
  `- sources:`.
- **`## Prompt` is the pick-up contract**: it must stand alone pasted into a fresh Claude
  session at the repo root and tell that session to read the stub file.

## Profile: pipeline (2026-09-18)

This repo is on the estate's **pipeline** profile. The authoritative formats — breakdown, stub,
the triage stub, the archive rules — are in the template-owned `intake/CONTEXT.md`; this file
stays the short micro-copy. What changes for a stub here: `/pipeline new` consumes it into
`_done/` and opens the run's draft PR, so `## Prompt` is optional; `validate-intake.sh <epic>`
checks the bookkeeping; `close-out.sh` archives the epic when its last run merges. The `go-live/`
stubs are the exception — human ops checklists (DNS, Stripe, Resend), never spun into a run;
they move to `_done/` by hand when Jamie confirms the box.

## Status is positional

- Open = the stub sits in a live epic or triage. Next = lowest unmet sequence.
- Done = `git mv` the stub to its epic's `_done/` in the PR that finishes the work.
  Dropped work moves there too with a `> Dropped: <reason, date>` line prepended.
- A completed epic archives whole: `git mv intake/<epic>/ intake/_done/<epic>/`.

## History

The tree was purged on 2026-09-11 (every earlier epic, triage stub and `_done/` archive)
to leave only the go-live work; `git log -- .icm/intake` holds the rest.
