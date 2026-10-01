# Project: quote-refund-echo-race

The run's context card — what a fresh session needs before it reads anything else. Pointers,
not copies: the spec stays the spec, the scope stays the scope. Seeded when the run is opened
(`new-run.sh` → `run-pack.sh --init`), sharpened by whichever stage learns something. Read with
`status.md` and `handoff.md` on every resume (`_shared/stage-preamble.md`).

- stub: intake/quote-refund-hardening/quote-refund-echo-race.md
- scope: none
- spec: 02_define/output/spec.md
- touches: web/src/lib/quote-refund.ts, web/src/app/api/stripe/webhook/route.ts, web/src/lib/message-log.ts, web/src/db/schema.ts, web/drizzle/, web/src/lib/booking-emails.ts, web/src/content/emails.ts, web/src/lib/admin-messages.ts
- complexity: complex → model: opus (executor — select-model.sh --stage 03_build)

## Constraints

- Only `quote-refund.ts`'s claim order and the cancellation notice change — the stale-total read,
  the post-refund write guard, the idempotency key and the dedupe are the epic's other stubs.
- The tour refund path (`syncRefundFromStripe`, `booking-refund.ts`) is untouched.
- D9 (weddings deposit terms) and the `[LAWYER]` items are not decided here.
- The email copy is the spec's table, PT and EN in sync; admin wording from
  `.icm/docs/admin-pt-inventory.md`.
- No new processor: `.icm/docs/data-protection.md` is unchanged.

## Context budget

- Define read excerpts of `booking-emails.ts`, `content/emails.ts`, `message-log.ts`, `schema.ts`
  and the webhook route to settle the notice's key, copy and migration.
