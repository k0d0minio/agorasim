# Stub: Bump next and undici past the high/critical advisories

- lane: chore
- found-by: unpaid-balances-panel-order / security-check.sh --branch · 2026-10-01
- complexity: low
- priority: P1

## Problem

`pnpm audit --audit-level=high` in `web/` reports 1 critical and 3 high advisories, all
already on `main` (no lockfile change on the branch that found them):
- critical — Next.js remote code execution in `next/og` — `web>next` 16.3.4, patched
  `>=16.3.6`. No `next/og` / `ImageResponse` use was found under `web/src`, which lowers the
  exposure but does not remove the advisory.
- high ×2 — undici denial of service / TLS certificate validation bypass — `web>shadcn>undici`,
  patched `>=7.29.1`.
- high — undici denial of service — `web>@vercel/blob>undici`, patched `>=6.28.1`.

Every run's `security-check.sh --branch` reports `BLOCKED` on this until it is fixed.

## Proposed change

Bump `next` to `>=16.3.6` in `web/package.json` (and `eslint-config-next` with it if pinned
to match); bump `shadcn` / `@vercel/blob` or add a `pnpm.overrides` entry for `undici` to the
patched ranges; regenerate `pnpm-lock.yaml` with pnpm; `pnpm audit --audit-level=high` clean.
