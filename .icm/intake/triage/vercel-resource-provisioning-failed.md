# Stub: Vercel preview deploys fail with "Resource provisioning failed" before any build log

- lane: chore
- found-by: bug lane fix-status-messages-and-focus · 2026-10-02
- priority: P2

## Problem

On PR 180 both draft heads (`6b81c72`, a stub move only, and `fa82971`) ended `ERROR` /
`BUILD_FAILED`, errorMessage "Resource provisioning failed", ~1s after start, with no build
events. The first head carries no code change, so the fault is not the diff. `ci-status.sh`
reads it as RED on the blocking `Vercel` status.

## Proposed change

Check the Vercel project's integrations/resources (a Neon or storage resource failing to
provision for the branch environment) in the dashboard; fix, then re-run the deployment.

## Prompt

In the agorasim repo, read `.icm/intake/triage/vercel-resource-provisioning-failed.md` and
establish why branch deployments of project `agorasim` fail with "Resource provisioning
failed" (dashboard: kodominio/agorasim → Settings → Integrations / Storage). This is mostly a
dashboard fix; `git mv` the stub to `_done/` in the PR, on a `claude/` branch.
