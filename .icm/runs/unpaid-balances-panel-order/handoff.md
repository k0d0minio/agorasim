# Handoff: unpaid-balances-panel-order

For the next session — human or agent — what to do first and what stands in the way.
Rewritten, not appended, at every stage stop; a stage that STOPs mid-way writes it before it
stops, so nothing is carried in anyone's head.

## Next steps

1. Operator smokes the preview
   (https://agorasim-git-claude-lucid-clarke-wmw5qx-kodominio.vercel.app/admin/sales) — the
   "Saldo por pagar" panel: upcoming events first; past ones under "Eventos passados"; the
   "+ N eventos passados não mostrados" line only past 50; a search hides the panel.
2. Operator ticks **Ready to merge** on https://github.com/k0d0minio/agorasim/pull/163, then
   `/pipeline release unpaid-balances-panel-order`.

## Blockers

- blocked on operator: smoke the preview and tick **Ready to merge** on
  https://github.com/k0d0minio/agorasim/pull/163.

## Do not

- Tick either gate box.
- Bump `next` / `undici` in this PR — the dependency advisories `security-check.sh --branch`
  reports are pre-existing and parked as `.icm/intake/triage/dependency-advisories-next-undici.md`.
- Change the balance eligibility rule — `one-open-instalment-rule`'s territory.
