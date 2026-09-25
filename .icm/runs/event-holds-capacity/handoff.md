# Handoff: event-holds-capacity

For the next session — human or agent — what to do first and what stands in the way.
Rewritten, not appended, at every stage stop; a stage that STOPs mid-way writes it before it
stops, so nothing is carried in anyone's head.

## Next steps

1. Jamie smokes the preview of PR #155 (https://agorasim-git-claude-zealous-allen-4e7331-kodominio.vercel.app): with a quote at `deposit_paid` on an opened date, `/reservar` shows the day unavailable and a checkout for it is refused; `/admin/calendar` shows the dark chips and the event on the day sheet (with the Conflito badge when tours exist); a draft quote on a day with tours shows the warning and still sends; "Cancelar evento" / a refund that cancels puts the day back.
2. Tick **Ready to merge** on https://github.com/k0d0minio/agorasim/pull/155, then `/pipeline release event-holds-capacity`.

## Blockers

- blocked on operator: smoke the preview and tick **Ready to merge** on PR #155.
- `Quality (advisory)` is red on `backup.test.ts` from `main` (#156) — not this run's; `intake/triage/backup-registry-rate-limit-windows.md` fixes it. The merge does not wait on the advisory job.

## Do not

- Do not tick Ready to merge; never merge without it.
- Do not fix `backup.ts` inside this run — it is the triage stub's.
- Do not write to `availability` or add quote columns — D-1/D-2.
