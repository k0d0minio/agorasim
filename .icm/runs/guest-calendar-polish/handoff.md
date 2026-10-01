# Handoff: guest-calendar-polish

For the next session — human or agent — what to do first and what stands in the way.
Rewritten, not appended, at every stage stop; a stage that STOPs mid-way writes it before it
stops, so nothing is carried in anyone's head.

## Next steps

1. Operator: read `02_define/output/spec.md`; to change it, `revise guest-calendar-polish "<what>"`.
2. Operator: tick **Spec approved** in the body of https://github.com/k0d0minio/agorasim/pull/172.
3. Then `build guest-calendar-polish` — execute `plan.md` pass by pass.

## Blockers

- blocked on operator: tick **Spec approved** on https://github.com/k0d0minio/agorasim/pull/172

## Do not

- Do not start Build before the Spec approved box is ticked; never tick it.
- Do not touch the admin calendar (`web/src/components/admin/availability-calendar.tsx`) —
  that is `admin-block-days`.
- Do not change `departureUsable`'s rule or the server's availability checks.
