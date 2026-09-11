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

## Status is positional

- Open = the stub sits in a live epic or triage. Next = lowest unmet sequence.
- Done = `git mv` the stub to its epic's `_done/` in the PR that finishes the work.
  Dropped work moves there too with a `> Dropped: <reason, date>` line prepended.
- A completed epic archives whole: `git mv intake/<epic>/ intake/_done/<epic>/`.

## History

The tree was purged on 2026-09-11 (every earlier epic, triage stub and `_done/` archive)
to leave only the go-live work; `git log -- .icm/intake` holds the rest.
