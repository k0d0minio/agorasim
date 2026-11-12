# Stub: Delete the Neon branch of each closed preview

- lane: chore
- found-by: Jamie's report, `uat-agorasim` at 10 of 10 branches, PR 253's preview failed · 2026-11-12
- complexity: low
- priority: P1

## Problem

The Neon integration on Vercel makes the branch `preview/<git branch>` in `uat-agorasim` for
each preview. It does not delete that branch when the git branch is deleted or the pull request
merges. It deletes the branch only when Vercel deletes the preview deployment (180 days on Pro).
On 2026-11-12 the project held 10 of 10 branches, 5 of them orphans. A new preview then fails
before its build.

## Proposed change

Add `.github/workflows/neon-preview-cleanup.yml`. It deletes each `preview/*` branch of
`uat-agorasim` whose git branch is gone, or whose pull request closed. It runs when a pull
request closes, each day at 03:00 UTC, and by hand.

## Acceptance criteria

- [ ] The workflow runs on `pull_request: closed`, on a daily schedule at 03:00 UTC, and on `workflow_dispatch`.
- [ ] It deletes only a branch that is not default, not protected, and whose name starts with `preview/`.
- [ ] It deletes the branch whose name minus `preview/` is the closed pull request's head branch.
- [ ] It deletes each `preview/*` branch that has no live git branch.
- [ ] It prints `keep` or `delete <name> (<reason>)` for each branch, and a final count.
- [ ] After the merge, the run from this pull request's close passes and deletes `preview/triage/neon-preview-cleanup`.
