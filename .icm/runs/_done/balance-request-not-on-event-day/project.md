# Project: balance-request-not-on-event-day

The run's context card — what a fresh session needs before it reads anything else. Pointers,
not copies: the spec stays the spec, the scope stays the scope. Seeded when the run is opened
(`new-run.sh` → `run-pack.sh --init`), sharpened by whichever stage learns something. Read with
`status.md` and `handoff.md` on every resume (`_shared/stage-preamble.md`).

- stub: intake/balance-scheduler-hardening/balance-request-not-on-event-day.md
- scope: none
- spec: 02_define/output/spec.md
- touches: web/src/lib/balance-schedule.ts, web/src/lib/quotes.ts, web/src/lib/cron/balance-scheduler.ts, web/src/lib/balance-schedule.test.ts, web/src/lib/cron/balance-scheduler.test.ts
- complexity: trivial → model: sonnet (executor — select-model.sh --stage 03_build)

## Constraints

- The T−3 flag (`isBalanceFlagged`, `listUnpaidBalancesDue`) is unchanged — an event-day
  open balance stays on "Saldo por pagar" and the quote-card badge.
- No T−0 automation of any kind: nothing releases a date, cancels, or emails on the day.
- The quote page is untouched — a couple holding a link can still pay on the event day.

## Context budget

- Define read `balance-schedule.ts`, the two queries in `quotes.ts`, the job header and the test
  fixtures to confirm the reminder had the same event-day hole — within budget.
