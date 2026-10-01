# Handoff: balance-request-not-on-event-day

For the next session — human or agent — what to do first and what stands in the way.
Rewritten, not appended, at every stage stop; a stage that STOPs mid-way writes it before it
stops, so nothing is carried in anyone's head.

## Next steps

1. Once **Spec approved** is ticked on https://github.com/k0d0minio/agorasim/pull/162, run
   `/pipeline build balance-request-not-on-event-day` and execute `plan.md` pass by pass.

## Blockers

- blocked on operator: tick **Spec approved** in the body of
  https://github.com/k0d0minio/agorasim/pull/162

## Do not

- Do not touch `isBalanceFlagged` or `listUnpaidBalancesDue` — the event-day balance stays on
  the panel.
- Do not reorder the panel or move `isBalanceOpen` — stubs 2 and 3 of this epic own those.
- Do not run build, lint, typecheck or test locally — CI is the source of truth.
