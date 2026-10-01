# Handoff: open-by-default

For the next session — human or agent — what to do first and what stands in the way.
Rewritten, not appended, at every stage stop; a stage that STOPs mid-way writes it before it
stops, so nothing is carried in anyone's head.

## Next steps

1. Operator reads `02_define/output/spec.md` (or the PR's Spec block); a change goes through
   `revise open-by-default "<what>"`.
2. Operator ticks **Spec approved** in the body of https://github.com/k0d0minio/agorasim/pull/168.
3. Then `/pipeline build open-by-default` — executor on `opus` (complexity: complex); follow
   `plan.md` pass by pass.

## Blockers

- blocked on operator: tick **Spec approved** on https://github.com/k0d0minio/agorasim/pull/168

## Do not

- Do not start Build before the Spec approved tick; never tick it.
- Do not touch the admin Calendar's controls or the guest picker's look — `admin-block-days`
  and `guest-calendar-polish` own them.
- Do not write a migration or touch existing `availability` rows.
- Do not run build, lint, typecheck or test locally — CI is the source of truth.
