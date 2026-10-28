# Intake — Agorasim tickets

Open work for this repo lives here as **epics and stubs**. The formats, the writing rules and
the loop from stub to merge are in `CONTEXT.md`, the blueprint's contract. This file is what is
true of this backlog.

## Shape

- **Epic** = `<epic-slug>/` with a `breakdown.md` (what was understood + `## Build order`)
  and one stub per unit of work. Every stub carries `- feature-slug:` (= filename),
  `- sequence: <n> of <m>`, `- depends-on: none | <in-epic slugs sequenced earlier>`.
- **Triage** = `triage/<slug>.md` for one-off findings, with `- lane: bug | tweak | chore`
  and `- found-by:`.
- **Identity is the path** (`<epic>/<slug>`); H1 is `# Stub: <title>`. No numbers.
- Optional dash-lines: `- priority: P0|P1|P2`, `- size:`, `- blocked: <reason>`,
  `- sources:`.
- **`## Prompt` is optional**: the stub is its own brief.
  session at the repo root and tell that session to read the stub file.

## Order

Set by Jamie on 2026-10-27.

1. triage
2. bookings-and-payment-links
3. wedding-quotes
4. open-and-private-tours

## The loop

`.icm/scripts/new-run.sh <epic>/<slug>` starts a stub: it moves the stub into `_done/` and opens
the draft pull request. `.icm/scripts/close-out.sh` moves a finished epic into `_done/`. The
go-live choreography (DNS, Stripe, Resend, the switch) is not a ticket. It is the runbook at
`.icm/docs/launch-runbook.md`, and Jamie drives it.

## Status is positional

- Open = the stub sits in a live epic or triage. Next = lowest unmet sequence.
- Done = `git mv` the stub to its epic's `_done/` in the PR that finishes the work.
  Dropped work moves there too with a `> Dropped: <reason, date>` line prepended.
- A completed epic archives whole: `git mv intake/<epic>/ intake/_done/<epic>/`.

## History

The tree was purged on 2026-09-11 (every earlier epic, triage stub and `_done/` archive)
to leave only the go-live work; `git log -- .icm/intake` holds the rest. On 2026-10-23 the
`go-live/` epic was deleted (Jamie's decision) and the backlog was cut again from the client's
feedback round 1 of 2026-10-12 (Drive, `feedback-round-1.pdf`): five epics and six triage stubs.
