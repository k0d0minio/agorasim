# Project: one-open-instalment-rule

The run's context card — what a fresh session needs before it reads anything else. Pointers,
not copies: the spec stays the spec, the scope stays the scope. Seeded when the run is opened
(`new-run.sh` → `run-pack.sh --init`), sharpened by whichever stage learns something. Read with
`status.md` and `handoff.md` on every resume (`_shared/stage-preamble.md`).

- stub: intake/balance-scheduler-hardening/one-open-instalment-rule.md
- scope: none
- spec: 02_define/output/spec.md
- touches: web/src/lib/quote-math.ts, web/src/lib/quotes.ts, web/src/lib/balance-schedule.ts, web/src/lib/cron/balance-scheduler.ts, web/src/lib/quote-math.test.ts, web/src/lib/balance-schedule.test.ts
- complexity: trivial → model: sonnet (executor — select-model.sh --stage 03_build)

## Constraints

- No behaviour change: same statuses (`pending`, `issued`), same `amountCents > 0`, same rows read and written.
- `quote-math.ts` stays free of runtime imports — the browser quote builder imports it.
- One name for the rule (`isOpenInstalment`); no `isBalanceOpen` alias.
- Status lists that mean something else (refundable / terminal statuses in `quote-refund.ts`) are not touched.

## Context budget

- Targeted greps of `quotes.ts` beyond the stub turned up the SQL copies of the status list; the
  operator settled in session that the shared constant covers them and the four write guards.
