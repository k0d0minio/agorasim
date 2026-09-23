# Project: admin-quote-builder

The run's context card — what a fresh session needs before it reads anything else. Pointers,
not copies: the spec stays the spec, the scope stays the scope. Seeded when the run is opened
(`new-run.sh` → `run-pack.sh --init`), sharpened by whichever stage learns something. Read with
`status.md` and `handoff.md` on every resume (`_shared/stage-preamble.md`).

- stub: intake/quote-flow/admin-quote-builder.md
- scope: none
- spec: 02_define/output/spec.md
- touches: web/src/app/admin/sales, web/src/components/admin, web/src/lib/quotes.ts, web/src/lib/booking-emails.ts, web/src/lib/message-log.ts, web/src/lib/cancellation-token.ts, web/src/db/schema.ts, web/drizzle, web/src/content/terms.ts, web/docs/guia-telemovel.md
- complexity: complex → model: opus (executor — select-model.sh --stage 03_build)

## Constraints

- <what must stay true while this run is built — from the spec's Out of scope, the `D-n`
  decisions in `decisions.md`, and `_shared/project-rules.md`>

## Context budget

- <what was loaded beyond the stage's Inputs, and why — the stage's overrun note lives here>
