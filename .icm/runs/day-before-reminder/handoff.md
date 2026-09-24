# Handoff: day-before-reminder

For the next session — human or agent — what to do first and what stands in the way.
Rewritten, not appended, at every stage stop; a stage that STOPs mid-way writes it before it
stops, so nothing is carried in anyone's head.

## Next steps

1. Jamie reads `02_define/output/spec.md` and ticks **Spec approved** on
   https://github.com/k0d0minio/agorasim/pull/124.
2. Then `build day-before-reminder` — execute `plan.md` pass by pass.

## Blockers

- none (the dependency `message-log-move-safe` merged in #110 and is on `uat`).

## Do not

- Tick either gate box. Start Build before the tick.
- Add a second cron or change the dispatch schedule — the catch-up rides the 06:00 run.
- Re-run `new-run.sh` — one PR per run; a spec change is `revise day-before-reminder "<change>"`.
