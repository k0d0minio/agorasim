# Handoff: balance-scheduler

For the next session — human or agent — what to do first and what stands in the way.
Rewritten, not appended, at every stage stop; a stage that STOPs mid-way writes it before it
stops, so nothing is carried in anyone's head.

## Next steps

1. Operator: smoke the preview https://agorasim-git-claude-friendly-pasteur-6bboxr-kodominio.vercel.app
   — the Sales board (`/admin/sales`: no "Saldo por pagar" panel unless a deposit-paid quote is ≤ 3 days
   out), a lead's quote card, and the dispatcher's summary line (`/api/cron/dispatch` with the cron secret).
2. Operator: tick **Ready to merge** on https://github.com/k0d0minio/agorasim/pull/152, then run
   `/pipeline release balance-scheduler`.

## Blockers

- blocked on operator: smoke the preview and tick **Ready to merge** on https://github.com/k0d0minio/agorasim/pull/152

## Do not

- Do not tick Ready to merge; never merge without it.
- Do not add an `overdue` status, a release-the-date action or a team email — out of scope.
- Read `03_build/output/notes.md` → Notes for Release (spec gaps D-4, D-5) before the reviews.
