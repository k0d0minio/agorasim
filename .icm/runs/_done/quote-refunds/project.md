# Project: quote-refunds

The run's context card — what a fresh session needs before it reads anything else. Pointers,
not copies: the spec stays the spec, the scope stays the scope. Seeded when the run is opened
(`new-run.sh` → `run-pack.sh --init`), sharpened by whichever stage learns something. Read with
`status.md` and `handoff.md` on every resume (`_shared/stage-preamble.md`).

- stub: intake/quote-flow/quote-refunds.md
- scope: none
- spec: 02_define/output/spec.md
- touches: web/src/lib/booking-refund.ts, web/src/lib/quotes.ts, web/src/app/api/stripe/webhook/route.ts, web/src/app/admin/sales/actions.ts, web/src/components/admin/lead-quote-card.tsx, web/src/content/emails.ts, web/src/lib/message-log.ts, web/src/db/schema.ts, web/drizzle
- complexity: complex → model: opus (executor — select-model.sh --stage 03_build)

## Constraints

- D9 (30-day non-refundable default, [LAWYER]) is not computed anywhere: the amount is the team's call.
- The tour refund path (bookings, `cancelAndRefundBooking`, `syncRefundFromStripe` on bookings) keeps its behaviour exactly.
- The deposit/balance receipts stay once-per-quote; the refund email alone is once-per-refund.
- A quote is cancelled only by an explicit operator act (the dialog box or the card action), never by a dashboard refund.
- No terms-text change; no capacity release here (`event-holds-capacity` reads `cancelled`).

## Context budget

- Define read targeted slices of `lib/booking-refund.ts`, `lib/quotes.ts`, `db/schema.ts` (quote enums, `quote_payments`, `message_log` indexes), the webhook route and the admin quote card/cancel dialog, to settle the message-key and cancel questions — beyond the stage's Inputs table, deliberately.
