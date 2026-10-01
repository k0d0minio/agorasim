# Handoff: refund-idempotency-cached-declines

For the next session — human or agent — what to do first and what stands in the way.
Rewritten, not appended, at every stage stop; a stage that STOPs mid-way writes it before it
stops, so nothing is carried in anyone's head.

## Next steps

1. Operator: smoke the preview (https://agorasim-git-claude-hopeful-einstein-5911ev-kodominio.vercel.app,
   admin → Vendas → a lead with a paid quote deposit → "Reembolsar" part of it), tick
   **Ready to merge** on https://github.com/k0d0minio/agorasim/pull/169, then run
   `release refund-idempotency-cached-declines`.
2. Release: `security-check.sh --branch` will report the `dependency-audit` BLOCKED that is
   `main`'s (next/undici; parked in `triage/`) — it needs the operator's waiver or that chore merged.

## Blockers

- blocked on operator: tick **Ready to merge** in the body of PR #169 after the smoke.

## Do not

- Do not tick either gate; do not merge from here.
- Do not touch the fee top-up keys or extract a shared refund helper (stub 5 owns that).
