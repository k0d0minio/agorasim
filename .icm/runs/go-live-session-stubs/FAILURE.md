# Failures: go-live-session-stubs

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

### 2026-09-23 — three stubs in one lane PR

- what happened: the go-live epic's three session stubs (6, 7, 8) were finished in one bug-lane
  PR instead of three, because the cloud session was bound to one harness-named branch and
  `new-run.sh` binds one run to that branch.
- why: the stubs share one subject (what `/reservar` and `stripe.ts` say in each key state) and
  each is small; three sessions for three S-sized stubs was the alternative.
- fixed by: recorded here and in `lane/output/notes.md`; the PR body names all three.

## Learned rules
