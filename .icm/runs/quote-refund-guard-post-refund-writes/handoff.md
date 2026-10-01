# Handoff: quote-refund-guard-post-refund-writes

For the next session — human or agent — what to do first and what stands in the way.
Rewritten, not appended, at every stage stop; a stage that STOPs mid-way writes it before it
stops, so nothing is carried in anyone's head.

## Next steps

1. The operator smokes the preview of https://github.com/k0d0minio/agorasim/pull/165 (the quote
   card's Reembolsar still works end to end; the failure path itself is covered by the unit
   tests — it cannot be forced from the UI), then ticks **Ready to merge**.
2. `/pipeline release quote-refund-guard-post-refund-writes`.

## Blockers

- blocked on operator: tick **Ready to merge** in the body of
  https://github.com/k0d0minio/agorasim/pull/165
- `security-check.sh --branch` is BLOCKED by a pre-existing dependency advisory on `main`
  (critical `next` < 16.3.6, high `undici`) — parked as
  `.icm/intake/triage/dependency-audit-next-undici.md`. Release stop class 2 reads the same
  audit; the operator decides whether that chore lands on `main` first.

## Do not

- Never tick Ready to merge.
- Do not bump `next` / `undici` in this PR — the manifest is outside this spec's `touches:`.
- Do not touch the claim order, the idempotency key or the running-total read in
  `quote-refund.ts` — stubs 1, 3 and 4 of `quote-refund-hardening`.
