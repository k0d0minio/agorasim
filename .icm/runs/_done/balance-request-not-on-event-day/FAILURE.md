# Failures: balance-request-not-on-event-day

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

### 2026-10-01 — the stub named one of two emails with the same event-day hole

- what happened: the stub (cut from a review finding) asked to stop only the T−14 request at
  T−1; Define found the T−7 reminder (`isReminderDue`, `listQuotesForBalanceReminder`) could
  also fire on the event morning and rotate the link.
- why: the review finding was written against `isRequestInWindow` alone; the reminder shares the
  job and the same `>= today` floor.
- fixed by: an operator decision at Define (D-1) widening the spec to both emails.

## Learned rules

- When a fix changes the date window of one email the balance job sends, check every other pass in `web/src/lib/cron/balance-scheduler.ts` for the same edge before the spec is written.
