# Handoff: vercel-build-migrates-previews

For the next session — human or agent — what to do first and what stands in the way.
Rewritten, not appended, at every stage stop; a stage that STOPs mid-way writes it before it
stops, so nothing is carried in anyone's head.

## Next steps

1. PR #114 is open into `uat` — smoke the preview's build log (the `[vercel-build] preview …` line, then `db:migrate`, `db:verify`, `next build`), then squash-merge from GitHub. The merge puts the script on UAT; the batch's promotion carries it to `main`.
2. After the merge into `uat`: the `uat` deployment's build log shows the same two steps against `preview/uat`.
3. Separately, the parked chore `.icm/intake/triage/dependency-advisories-2026-09-23.md` — `next` <16.3.3 is critical.

## Blockers

- none

## Do not

- Do not re-invoke the lane; the operator's merge click is the gate.
- Do not merge #114 from a session (`_shared/github.md`).
- Do not widen this PR to bump dependencies — that is the parked chore's diff.
