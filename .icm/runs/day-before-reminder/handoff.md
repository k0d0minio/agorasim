# Handoff: day-before-reminder

For the next session — human or agent — what to do first and what stands in the way.
Rewritten, not appended, at every stage stop; a stage that STOPs mid-way writes it before it
stops, so nothing is carried in anyone's head.

## Next steps

1. Jamie smokes the preview — https://agorasim-git-claude-eager-gates-x09b60-kodominio.vercel.app
   (the reminder is cron-only: call `/api/cron/dispatch` with the preview's `CRON_SECRET` as a
   `Bearer` header against a preview database holding a confirmed booking for tomorrow, then read
   the `cron.dispatch` audit row and the mail; or read the copy the tests render).
2. Tick **Ready to merge** on https://github.com/k0d0minio/agorasim/pull/124.
3. `release day-before-reminder`.

## Blockers

- none for the merge. Operator action before the reminder can send anywhere: `CRON_SECRET` is
  missing on Vercel/agorasim (`env.sh audit`); without it the dispatch route answers 503 and no
  job runs. Set the value in Vercel — see `03_build/output/notes.md` → Notes for Release.

## Do not

- Tick either gate box.
- Add a second cron or change the dispatch schedule — the catch-up rides the 06:00 run.
- Re-run `new-run.sh`; a spec change is `revise day-before-reminder "<change>"`.
