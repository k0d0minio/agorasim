# Handoff: day-before-reminder

For the next session — human or agent — what to do first and what stands in the way.
Rewritten, not appended, at every stage stop; a stage that STOPs mid-way writes it before it
stops, so nothing is carried in anyone's head.

## Next steps

1. Jamie adds `CRON_SECRET` in Vercel (agorasim: production, preview, development).
2. `release day-before-reminder` again: re-run `.icm/scripts/env.sh audit --changed` → must read
   `RESULT: OK`; then `ci-status.sh` on the head, step 7 (merge main + uat, check-migrations,
   retrospective, `## Release` record, close-out), step 8 merge, step 9 UAT read.

## Blockers

- `CRON_SECRET` missing on Vercel/agorasim (env audit, stop class 3). Not this branch's key —
  declared in `web/.env.example` since #72 — but every cron route answers 503 without it. The
  operator chose: set it, then merge (no waiver).

## Do not

- Merge before the env audit reads OK. Waive the gap on the operator's behalf.
- Re-run the review fixes: they are in facadba (passes isolated, anonymised leads skipped,
  privacy basis covers phone bookings, data-protection.md synced, triage stub
  `booking-logistics-facts-shared` parked).
