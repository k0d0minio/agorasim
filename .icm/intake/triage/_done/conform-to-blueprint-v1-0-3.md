# Stub: The repo renders from the blueprint v1.0.3

- lane: chore
- found-by: the house drift report `desk/estate/drift-2026-10-28.md` · 2026-10-28
- complexity: medium
- priority: P2

## Problem

`.copier-answers.yml` names blueprint v1.0.2. The blueprint is at v1.0.3 (2026-10-28).

- v1.0.3: `.icm/scripts/vercel-build.sh` holds the migration rule of `.icm/database/CONTEXT.md`. `package.json` calls it with one line that never changes.

`web/package.json` runs the repo's own `web/scripts/vercel-build.sh`. It reads `VERCEL_ENV`, so it migrates every preview, and also `uat`, whose `VERCEL_ENV` is `preview`. The contract migrates `uat` and a preview with `MIGRATE_AT_BUILD=1` only.

## Proposed change

Run `copier update` to v1.0.3 with the answers of record. Then make the repo's own files follow the database contract at v1.0.3, once. After this change, the rule reaches the repo only through `copier update`.

`web/package.json`: `"vercel-build": "bash ../.icm/scripts/vercel-build.sh next build"`. Delete `web/scripts/vercel-build.sh`. `web/README.md` names the new script.

## Acceptance criteria

- [ ] `.copier-answers.yml` names `v1.0.3`, and its other lines do not change.
- [ ] The repo's own files change only as the proposed change says.
- [ ] `ci` is green.
