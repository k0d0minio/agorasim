# Handoff: refund-idempotency-cached-declines

For the next session — human or agent — what to do first and what stands in the way.
Rewritten, not appended, at every stage stop; a stage that STOPs mid-way writes it before it
stops, so nothing is carried in anyone's head.

## Next steps

1. Operator: read `02_define/output/spec.md`, tick **Spec approved** on
   https://github.com/k0d0minio/agorasim/pull/169, then run `build refund-idempotency-cached-declines`.
2. Build: follow `plan.md` passes 1–5.

## Blockers

- blocked on operator: tick **Spec approved** in the body of PR #169.

## Do not

- Do not start Build before the box is ticked; do not tick it.
- Do not touch the fee top-up keys or extract a shared refund helper (stub 5 owns that).
