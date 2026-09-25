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

- D25: the quote page mints the Checkout session and stamps `issued`; the job never mints a
  session and never stamps `issued` — its once-only is the message-log claim.
- The quote token's plaintext lives only in the email (`lib/quote-token.ts`); never log, audit or
  persist it. Rotation touches `access_token_hash` only.
- Nothing auto-releases a date or cancels a quote for an unpaid balance (client's open question).
- No migration: the balance kinds ride the existing `message_log_quote_receipt_key`.
- No local `build`/`lint`/`typecheck`/`test` — CI is the source of truth.

## Context budget

- Define read `lib/quotes.ts`, `lib/message-log.ts`, `lib/quote-token.ts`, `lib/quote-checkout.ts`
  (mint path), `lib/cron/*` and the Sales page to settle the link and idempotency design.
