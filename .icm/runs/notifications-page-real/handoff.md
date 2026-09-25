# Handoff: notifications-page-real

For the next session — human or agent — what to do first and what stands in the way.
Rewritten, not appended, at every stage stop; a stage that STOPs mid-way writes it before it
stops, so nothing is carried in anyone's head.

## Next steps

1. Operator: read `02_define/output/spec.md`; change it with `revise notifications-page-real "<what>"`, or tick **Spec approved** on https://github.com/k0d0minio/agorasim/pull/153.
2. Then `build notifications-page-real` — executes `plan.md` passes 1–4 on branch `claude/kind-gauss-r4k114`.

## Blockers

- blocked on operator: tick **Spec approved** in the body of https://github.com/k0d0minio/agorasim/pull/153

## Do not

- Do not start Build before the Spec approved tick; never tick it.
- Do not add cards for `balance-request` / `balance-reminder` (D-5) or touch the social preview page.
- Do not change `message_log`'s schema or indexes.
