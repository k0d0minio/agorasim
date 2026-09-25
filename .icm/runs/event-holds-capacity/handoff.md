# Handoff: event-holds-capacity

For the next session — human or agent — what to do first and what stands in the way.
Rewritten, not appended, at every stage stop; a stage that STOPs mid-way writes it before it
stops, so nothing is carried in anyone's head.

## Next steps

1. Jamie reads `02_define/output/spec.md` (or the PR's Spec block) and ticks **Spec approved** on https://github.com/k0d0minio/agorasim/pull/155 — or runs `revise event-holds-capacity "<what>"`.
2. Then `/pipeline build event-holds-capacity`, executing `plan.md` pass by pass.

## Blockers

- blocked on operator: tick **Spec approved** in the body of PR #155.

## Do not

- Do not start Build before the tick; never tick it.
- Do not add slot/vehicle columns to `quotes` or write to `availability` — D-1/D-2.
- Do not edit `.icm/project.md` to close the open question — `/project agorasim` in icm-board does.
