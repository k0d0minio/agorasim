# Handoff: quote-refunds

For the next session — human or agent — what to do first and what stands in the way.
Rewritten, not appended, at every stage stop; a stage that STOPs mid-way writes it before it
stops, so nothing is carried in anyone's head.

## Next steps

1. Operator reads `02_define/output/spec.md` and ticks **Spec approved** on
   https://github.com/k0d0minio/agorasim/pull/142 (or runs `revise quote-refunds "<change>"`).
2. Then `/pipeline build quote-refunds` — follow `plan.md` pass by pass; load the
   `database-migration` skill for pass 1.

## Blockers

- blocked on operator: tick **Spec approved** in the body of PR #142.

## Do not

- Do not tick either gate box.
- Do not widen `message_log_quote_receipt_key` — key the refund email on its own.
- Do not change tour refund behaviour or the existing `route.test.ts` refund cases.
- Do not compute the D9 30-day rule anywhere; do not touch `web/src/content/terms.ts`.
