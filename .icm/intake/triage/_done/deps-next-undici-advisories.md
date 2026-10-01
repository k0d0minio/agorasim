# Stub: Upgrade next (critical next/og RCE) and the undici behind shadcn and @vercel/blob

- lane: chore
- found-by: quote-refund-echo-race (security-check.sh --branch — pre-existing on main, not added by the branch) · 2026-10-01
- complexity: low
- priority: P0

## Problem

`pnpm audit --audit-level=high` in `web/` reports 1 critical and 3 high advisories, all on
`main`'s lockfile: **Next.js — Remote Code Execution in `next/og`** (`web>next`, patched
`>=16.3.6`); undici DoS via unrequested responses (`web>shadcn>undici` patched `>=7.29.1`,
`web>@vercel/blob>undici` patched `>=6.28.1`); undici TLS certificate validation bypass
(`web>shadcn>undici`, patched `>=7.29.1`). `security-check.sh --branch` reports `BLOCKED` on
every run branch until they are gone.

## Proposed change

Bump `next` to `>=16.3.6` (and `eslint-config-next` with it) and the parents of undici (`shadcn`,
`@vercel/blob`) — or a `pnpm.overrides` pin on undici if the parents have not released — then
`pnpm audit --audit-level=high` → clean, `security-check.sh --branch` → `OK`, and the preview
builds.

## Prompt

In the agorasim repo, read `.icm/intake/triage/deps-next-undici-advisories.md`. Upgrade `next`
past the `next/og` RCE and lift undici past both advisories (parents first, an override only if
they have not released); regenerate `web/pnpm-lock.yaml` with pnpm, never by hand. Prove it with
`pnpm audit --audit-level=high` in `web/` and `.icm/scripts/security-check.sh <slug> --branch` →
`RESULT: OK`. `git mv` the stub to `_done/` in the PR, on a `claude/` branch; CI is the source of
truth.
