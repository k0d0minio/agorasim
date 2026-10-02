# Stub: Every Vercel preview build fails with "Resource provisioning failed"

- lane: bug
- found-by: availability-online-window-tidy chore · 2026-10-02
- complexity: low

## Problem

On 2026-10-02 every `agorasim` deployment, across at least four unrelated `claude/*` branches
(including a commit that only moved a triage stub), went `ERROR` in about one second with
`errorCode: BUILD_FAILED`, `errorMessage: "Resource provisioning failed"` and no build log. The
build never starts, so the `Vercel` status — the repo's only blocking check — is `RED` on every
PR. Likely the Neon Marketplace integration failing to provision a `preview/<branch>` database
branch (quota, key or integration state), not a code fault.

## Proposed change

Operator-side first: open one failed deployment in the Vercel dashboard and the Neon integration
(`uat-agorasim`) to see what refused the branch (branch-count limit, expired key, paused project),
and clear it. If it is a stale-branch limit, delete old `preview/*` / `run/*` branches. No repo
change expected; redeploy a failed PR to confirm.

## Prompt

In the agorasim repo, read `.icm/intake/triage/vercel-resource-provisioning-failed.md`. Check
`.icm/scripts/db-env.sh status` for the `uat-agorasim` Neon project's branch count against its
plan limit and list stale `preview/*` and `run/*` branches; report them and ask before deleting
any. Redeploying a failed PR's preview must go `READY`.
