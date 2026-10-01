# Handoff: quote-refund-guard-post-refund-writes

For the next session — human or agent — what to do first and what stands in the way.
Rewritten, not appended, at every stage stop; a stage that STOPs mid-way writes it before it
stops, so nothing is carried in anyone's head.

## Next steps

1. Once **Spec approved** is ticked on https://github.com/k0d0minio/agorasim/pull/165, run
   `/pipeline build quote-refund-guard-post-refund-writes` and follow `plan.md` pass by pass.

## Blockers

- blocked on operator: tick **Spec approved** in the body of
  https://github.com/k0d0minio/agorasim/pull/165

## Do not

- Do not start Build before the tick; never tick it.
- Do not touch the claim order, the idempotency key or the running-total read in
  `quote-refund.ts` — those are stubs 1, 3 and 4 of `quote-refund-hardening`.
- Do not wrap `issueInstalmentRefund` in the new try/catch — a Stripe refusal stays
  `refund-failed`.
