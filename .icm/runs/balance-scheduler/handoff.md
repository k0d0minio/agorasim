# Handoff: balance-scheduler

For the next session — human or agent — what to do first and what stands in the way.
Rewritten, not appended, at every stage stop; a stage that STOPs mid-way writes it before it
stops, so nothing is carried in anyone's head.

## Next steps

1. Operator: read `02_define/output/spec.md` (or the PR's Spec block), tick **Spec approved** on
   https://github.com/k0d0minio/agorasim/pull/152, then run `/pipeline build balance-scheduler`.
2. Build: execute `plan.md` pass by pass on `claude/friendly-pasteur-6bboxr`.

## Blockers

- blocked on operator: tick **Spec approved** on https://github.com/k0d0minio/agorasim/pull/152

## Do not

- Do not start Build before the **Spec approved** tick; never tick it.
- Do not mint a Checkout session or stamp `issued` from the job (D25).
- Do not add an `overdue` status, a release-the-date action or a team email — out of scope.
- Do not touch `event-holds-capacity` territory (capacity, the Calendar).
