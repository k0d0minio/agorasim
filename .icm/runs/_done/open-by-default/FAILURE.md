# Failures: open-by-default

The run's retrospective — what cost a turn, and the rule that would have prevented it. Two
files share this job and split it cleanly: `error.log` (in the stage's `output/`) is the ledger
of errors a **tool** reported, written verbatim at the moment of the fix with its `- resolved:`
and `- rule:` lines, which `retrospective.sh` reads and counts across runs; **this file** is
what the run as a whole learned — a wrong assumption, a STOP, a skipped step, a gate that
blocked, a plan that had to be rewritten — which no tool ever logged. On close-out the
`## Learned rules` bullets below are copied into `_shared/project-rules.md` → Learned rules
(`run-pack.sh <slug> --sync-rules`, called by `close-out.sh`, the same shape as
`retrospective.sh --apply`), so the next run in this repo starts with them. Keep the rules
general; keep the retrospectives specific; never restate an `error.log` entry here.

## Retrospectives

### 2026-10-01 — flipping "no row = closed" to "no row = open" dropped the bounds the rows had implied

- what happened: Release's code review found the team audience had no upper date bound — a
  crafted or mistyped manual booking or move for 2099 would have been accepted — and that the
  "Limpar" copy still promised a cleared departure "não existe no calendário".
- why: under the old rule a team sale needed a row, and rows could only be written inside the
  admin pager's 18 months, so the horizon was implicit in the data. Define specified the guest
  window and the team's exemptions, but not the bound the team still keeps; the old copy that
  described an absent row was outside `touches:`.
- fixed by: `teamHorizonEnd` (end of the admin pager's last month) on the team audience, and the
  Limpar / calendar-intro copy, in the Release fix commit.

## Learned rules

- When a default flips (absence of a row goes from "no" to "yes"), list every bound the stored rows used to enforce implicitly — a horizon, a roster, a past check — and restate each one explicitly in the spec, and grep the admin copy for sentences that describe the old absence. (`FAILURE.md` — open-by-default)
