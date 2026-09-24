# Stub: Bump the dependencies pnpm audit flags as high or critical — next 16.x is the critical one

- lane: chore
- found-by: security-check · 2026-09-23 (the gate on the vercel-build-migrates-previews chore; the advisories predate it)
- complexity: low
- priority: P1

## Problem

`pnpm audit --audit-level=high` in `web/` reports 2 critical and 15 high advisories in the current
lockfile, none introduced by a recent change. The one that matters at runtime: **`next` ≥16.0.0
<16.3.3 (critical)** — production runs it — and `sharp` <0.35.4 (high), which ships with it. The
rest are development tooling: `brace-expansion` (eslint → minimatch), `browserslist`
(eslint-config-next → @babel/core), `fast-uri` (shadcn → dotenvx → ajv), `js-yaml` (eslint →
@eslint/eslintrc), `nanoid` (@tailwindcss/postcss → postcss). Nine moderate ones sit below the
gate's bar. Until this is settled, `security-check.sh` blocks every change that touches a manifest
and the session has to skip the audit by name (`--no-audit`) after parking the finding here.

## Proposed change

One chore: bump `next` (and with it `sharp`) to the patched 16.3.x — read
`node_modules/next/dist/docs/` first (web/AGENTS.md) and smoke the preview — then `pnpm update`
the dev-tooling chain; CI's log for `pnpm audit --audit-level=high` should then read 0 high, 0
critical. Forward-only, no schema.
