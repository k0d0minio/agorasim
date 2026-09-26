# Stub: uat-agorasim's 10-branch cap blocks new preview deploys
> Retired 2026-09-26 (Jamie, estate audit): the non-production Neon project stays on the Free plan with its 10-branch cap — the 7-day TTL in db-branch.sh and neon-cleanup.yaml keep it under the cap, and it is working well. Not a problem to solve.

- lane: chore
- found-by: quote-page-throttle-wording (tweak lane, CI RED) · 2026-09-24
- complexity: research

## Problem

Every push on branch `claude/optimistic-ptolemy-wi4mpz` (PR #147, and its predecessor commit
`ae219e4` before this run's own code changes) failed the Vercel `Vercel` status with
`errorCode: BUILD_FAILED`, `errorMessage: "Resource provisioning failed"` — not a code error,
confirmed by reading the deployment directly (`mcp__Vercel__get_deployment`). The Neon project
behind UAT and previews, `uat-agorasim` (`lingering-frog-97017403`, `database.neon.nonprod_project_id`
in `.icm/project.json`), is a `free_v3` org plan with `branches_limit: 10`
(`mcp__Neon__describe_project`), and at the time of the failure it already carried exactly 10
branches: `main`, four `run/<slug>` branches (other in-flight runs) and five
`preview/claude/<branch>` branches (other sessions' open PRs). Vercel's Neon integration cannot
provision an 11th branch for this PR's own preview, so every deploy on this branch errors before
`next build` even starts — this repo's own `db-env.sh`/`db-branch.sh` never run, because the
failure is Vercel/Neon provisioning, not this repo's build step.

`neon-cleanup.yaml` deletes `preview/*` and `run/*` on PR close, so the cap is only reached when
several runs/PRs are open at once (as they were here) — this is a concurrency ceiling, not a
per-PR leak.

## Proposed change

Investigate: either raise `uat-agorasim`'s branch limit (a paid Neon plan or a higher free-tier
cap — Jamie's account decision), or shorten how long a `run/<slug>` branch lives before
`db-branch.sh`'s 7-day TTL reaps it, or cap how many Claude sessions run concurrently against
this repo. Whatever the fix, it is not a code change to `web/` — no PR can "fix" a quota.
