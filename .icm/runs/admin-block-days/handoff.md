# Handoff: admin-block-days

For the next session — human or agent — what to do first and what stands in the way.
Rewritten, not appended, at every stage stop; a stage that STOPs mid-way writes it before it
stops, so nothing is carried in anyone's head.

## Next steps

1. Operator: read `02_define/output/spec.md`, then tick **Spec approved** on
   https://github.com/k0d0minio/agorasim/pull/173 (or `revise admin-block-days "<what>"`).
2. Then `build admin-block-days` — Build follows `plan.md` pass by pass.

## Blockers

- blocked on operator: tick **Spec approved** in the body of PR #173.

## Do not

- Do not start Build before the Spec approved box is ticked; never tick it.
- Do not touch the guest picker on `/reservar` — `guest-calendar-polish` owns it.
- Do not change the availability rule, notice or window (`lib/availability.ts` beyond removing
  `clearDays`) — `open-by-default` settled it.
- Do not remove the `availability.cleared` audit label — historical log lines use it.
