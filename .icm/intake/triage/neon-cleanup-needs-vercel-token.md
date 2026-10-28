# Stub: neon-cleanup deletes the preview branch of a closed pull request

- lane: chore
- found-by: wedding-form-without-guest-count (Vercel preview red) · 2026-10-28
- complexity: low
- priority: P1

## Problem

`neon-cleanup.yml` fails on each closed pull request with `error: VERCEL_TOKEN is not set`.
The run for `region-wording-with-obidos` (Actions run 40678407358) shows it. The `preview/*`
branches of merged pull requests stay in the Neon project `uat-agorasim`. On 2026-10-28 the
project held 10 branches: `main` and 9 `preview/*`. Six of them belong to merged pull
requests. The free plan allows 10 branches. A new pull request then gets no branch, and its
Vercel preview fails with `BUILD_FAILED — Resource provisioning failed`.

All 9 `preview/*` branches show `creation_source: vercel`. The Vercel Neon integration made
them, not `preview-db.yml`. `.icm/database/CONTEXT.md` says the integration never serves
Preview.

## Proposed change

Operator:

1. Add the secret `VERCEL_TOKEN` in GitHub → Settings → Secrets and variables → Actions.
2. In Vercel → Storage, turn off preview branching on the Neon integration.
3. Delete the `preview/*` branches of closed pull requests in `uat-agorasim`.

## Acceptance criteria

- [ ] `neon-cleanup.yml` passes on the next closed pull request.
- [ ] A new pull request without a migration gets no `preview/*` branch in `uat-agorasim`.
- [ ] `uat-agorasim` holds no `preview/*` branch of a closed pull request.
