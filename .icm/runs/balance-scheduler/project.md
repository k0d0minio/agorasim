# Project: balance-scheduler

The run's context card — what a fresh session needs before it reads anything else. Pointers,
not copies: the spec stays the spec, the scope stays the scope. Seeded when the run is opened
(`new-run.sh` → `run-pack.sh --init`), sharpened by whichever stage learns something. Read with
`status.md` and `handoff.md` on every resume (`_shared/stage-preamble.md`).

- stub: intake/quote-flow/balance-scheduler.md
- scope: none
- spec: 02_define/output/spec.md
- touches: web/src/lib/cron/balance-scheduler.ts, web/src/lib/cron/jobs.ts, web/src/app/api/cron/dispatch/route.ts, web/src/lib/quotes.ts, web/src/lib/quote-token.ts, web/src/lib/message-log.ts, web/src/lib/booking-emails.ts, web/src/content/emails.ts, web/src/app/admin/sales/page.tsx, web/src/components/admin/lead-quote-card.tsx
- complexity: complex → model: opus (executor — select-model.sh --stage 03_build)

## Constraints

- <what must stay true while this run is built — from the spec's Out of scope, the `D-n`
  decisions in `decisions.md`, and `_shared/project-rules.md`>

## Context budget

- <what was loaded beyond the stage's Inputs, and why — the stage's overrun note lives here>
