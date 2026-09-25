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
- Base is red, not this run's: `main`'s UAT deploy of 8f918d7 (#150) and this PR's Vercel build fail
  `db:verify` — `0031_add_booking_move_seq` (when 1790289025381) merged after `0032_quote_one_draft_per_lead`
  (when 1790324401235) was already applied to `uat-agorasim`, so drizzle skips 0031 forever. Fix is a
  bug lane on `main` (move the move-seq migration after 0032 with a newer `when`, and apply it to the
  UAT database). Build merges `main` once that lands; until then `ci-status.sh` reads RED on Vercel.

## Do not

- Do not start Build before the **Spec approved** tick; never tick it.
- Do not mint a Checkout session or stamp `issued` from the job (D25).
- Do not add an `overdue` status, a release-the-date action or a team email — out of scope.
- Do not touch `event-holds-capacity` territory (capacity, the Calendar).
