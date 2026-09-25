# Failures: notifications-page-real

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

### 2026-09-25 — the cloud harness subscribed the run's PR to activity events

- what happened: right after `new-run.sh` opened #153, ten PR-activity notifications (Vercel comment edits, a failed preview status) woke the session.
- why: the cloud harness auto-subscribes a PR the session creates; `_shared/github.md` → PR events forbids any subscription in this repo.
- fixed by: `unsubscribe_pr_activity` on #153 at Define; CI read only through `ci-status.sh` from then on.

### 2026-09-25 — the draft preview was red from `main`, not from this run

- what happened: the Vercel preview on the draft head failed `verify-migrations.ts` (0031 skipped on the UAT database); a preview also built on a draft head, which the ignore step should suppress.
- why: #148 and #150 merged in the opposite order to their migration stamps; the UAT database applied the newer one first.
- fixed by: #154 on `main` (re-stamped the migration), merged into this branch before the ready flip.

## Learned rules

- In a cloud session, call `unsubscribe_pr_activity` on the PR as soon as `new-run.sh` opens it — the harness subscribes new PRs by default and this repo subscribes none.
