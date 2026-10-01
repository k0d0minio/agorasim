# Handoff: quote-refund-echo-race

For the next session — human or agent — what to do first and what stands in the way.
Rewritten, not appended, at every stage stop; a stage that STOPs mid-way writes it before it
stops, so nothing is carried in anyone's head.

## Next steps

1. Operator reads `02_define/output/spec.md` (or the PR's Spec block) and ticks **Spec approved**
   on https://github.com/k0d0minio/agorasim/pull/166; changes go through
   `revise quote-refund-echo-race "<what>"`.
2. Then `build quote-refund-echo-race` — follow `plan.md` pass by pass; pass 1 is a migration, so
   load the `database-migration` skill first.

## Blockers

- blocked on operator: tick **Spec approved** in the body of https://github.com/k0d0minio/agorasim/pull/166

## Do not

- Do not start Build before the tick, and never tick it.
- Do not touch the stale-total read, the post-refund write guard, the idempotency key or the
  tour refund path — they belong to the epic's other stubs.
- Do not run build, lint, typecheck or tests locally — CI is the source of truth.
