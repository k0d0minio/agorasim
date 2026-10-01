# Handoff: one-open-instalment-rule

For the next session — human or agent — what to do first and what stands in the way.
Rewritten, not appended, at every stage stop; a stage that STOPs mid-way writes it before it
stops, so nothing is carried in anyone's head.

## Next steps

1. Operator: smoke the preview https://agorasim-git-claude-zealous-fermi-v7oyuy-kodominio.vercel.app — the couple's quote page (deposit/balance due), the Sales board's "Saldo por pagar" panel and a quote card's balance badge should read exactly as before.
2. Operator: tick **Ready to merge** on https://github.com/k0d0minio/agorasim/pull/167, then `/pipeline release one-open-instalment-rule`.

## Blockers

- blocked on operator: smoke the preview and tick **Ready to merge** on https://github.com/k0d0minio/agorasim/pull/167
- `security-check.sh --branch` → BLOCKED 1 on `dependency-audit`: main's Next/undici advisories (no dependency changed here; parked as triage/deps-next-undici-advisories.md). Release's `--audit` read needs the operator's waiver or that chore merged first.

## Do not

- Do not change which statuses count as open — this run is a pure move.
- Do not touch the status lists in `quote-refund.ts`.
- Do not park another dependency stub — the advisories are already in triage.
