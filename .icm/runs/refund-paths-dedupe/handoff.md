# Handoff: refund-paths-dedupe

For the next session — human or agent — what to do first and what stands in the way.
Rewritten, not appended, at every stage stop; a stage that STOPs mid-way writes it before it
stops, so nothing is carried in anyone's head.

## Next steps

1. Operator reads `02_define/output/spec.md` and ticks **Spec approved** on
   https://github.com/k0d0minio/agorasim/pull/188 (or `revise refund-paths-dedupe "<what>"`).
2. Then `/pipeline build refund-paths-dedupe` — execute `plan.md` passes 1–5.

## Blockers

- blocked on operator: tick **Spec approved** in the body of PR #188.

## Do not

- Do not edit `booking-refund.test.ts`, `quote-refund.test.ts` or `quotes.test.ts` — their
  passing unchanged is the acceptance criterion.
- Do not start Build before the Spec approved tick.
