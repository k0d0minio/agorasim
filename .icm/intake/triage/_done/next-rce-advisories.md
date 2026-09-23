# Stub: Next.js 16.2.12 carries two critical unauthenticated-RCE advisories — bump to 16.3.3+

- lane: chore
- found-by: security-check · 2026-09-23 (the go-live-session-stubs lane's `--branch` gate)
- priority: P0

## Problem

`pnpm audit --audit-level=high` reports 17 high/critical advisories on the lockfile `main`
carries. Two are **critical** and in the framework itself: "Next.js: Unauthenticated Remote
Code Execution" (two advisories, vulnerable `>=16.0.0 <16.3.3`, patched `>=16.3.3`), and
`web/package.json` pins `next` and `eslint-config-next` at `16.2.12`. Production serves that
build today, and the site is about to take real money on it. The remaining 15 are high, in
`sharp` (via `next`), `brace-expansion`, `js-yaml`, `browserslist` (lint-time only, via
`eslint`/`eslint-config-next`), `nanoid` (via `@tailwindcss/postcss`) and `fast-uri` (via
`shadcn`, a dev tool). The gate blocks every lane's push on this until it is cleared, so it
is also what every future run trips over first.

## Proposed change

Bump `next` and `eslint-config-next` to the first `16.3.x` at or above `16.3.3` (a minor
inside the same major; `web/AGENTS.md` says read `node_modules/next/dist/docs/` for anything
that moved), regenerate the lockfile with `pnpm install`, and let `pnpm audit
--audit-level=high` say what is left — `sharp` should follow `next`; the lint-time and
dev-tool advisories are a `pnpm update` of `eslint`, `@tailwindcss/postcss` and `shadcn`
in the same PR if they resolve cleanly, a second stub if they do not. No code change is
expected; CI's build is the proof, and the operator smokes `/reservar` and `/admin` on
the preview before merging.

## Prompt

In the agorasim repo, read `.icm/intake/triage/next-rce-advisories.md`. Run
`/pipeline chore next-rce-advisories`: bump `next` and `eslint-config-next` in
`web/package.json` to `>=16.3.3`, regenerate `pnpm-lock.yaml`, re-run
`pnpm audit --audit-level=high` and record what remains in the lane notes. No local
build/lint/test — CI is the source of truth; `security-check.sh <slug> --branch` must
answer `RESULT: OK` before the push.
