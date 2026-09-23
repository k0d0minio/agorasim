# Promote: promote-uat-2026-09-23

- approved-by: Jamie
- approved-on: 2026-09-23
- uat-head: b333213
- url: https://uat.agorasim.jamienisbet.com
- note: none

## Batch

- vercel-build-migrates-previews — Vercel build migrates previews
- go-live-session-stubs — Go live session stubs
- next-rce-advisories — Next rce advisories

## After the merge

- `.icm/scripts/promote-uat.sh sync` — uat takes main, the batch resets, the promotion is announced (session repos)
- `.icm/scripts/deploy-status.sh --sha <merge-sha>` — one read of production, the operator's call
