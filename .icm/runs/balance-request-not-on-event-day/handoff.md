# Handoff: balance-request-not-on-event-day

For the next session — human or agent — what to do first and what stands in the way.
Rewritten, not appended, at every stage stop; a stage that STOPs mid-way writes it before it
stops, so nothing is carried in anyone's head.

## Next steps

1. Once **Ready to merge** is ticked on https://github.com/k0d0minio/agorasim/pull/162, run
   `/pipeline release balance-request-not-on-event-day`.

## Blockers

- blocked on operator: smoke the preview, then tick **Ready to merge** in the body of
  https://github.com/k0d0minio/agorasim/pull/162
- `security-check.sh --branch` reads `BLOCKED 1` on pre-existing dependency advisories (next
  16.3.4, undici) that are on `main`, not this branch — parked as
  `.icm/intake/triage/dependency-advisories-next-undici.md`; Release should treat it as
  not-this-branch's (notes.md → Notes for Release).

## Do not

- Do not touch `isBalanceFlagged` or `listUnpaidBalancesDue`; stubs 2 and 3 of this epic own the
  panel order and the shared predicate.
- Do not bump dependencies in this PR — the advisory stub is its own chore.
- Do not run build, lint, typecheck or test locally — CI is the source of truth.
