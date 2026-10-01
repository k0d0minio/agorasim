# Stub: Upgrade next and undici past four high/critical advisories

- lane: chore
- found-by: balance-request-not-on-event-day (Build — `security-check.sh --branch`, pre-existing, not added by the branch) · 2026-10-01
- complexity: low
- priority: P1

## Problem

`pnpm audit --audit-level=high` in `web/` reports 1 critical and 3 high advisories on `main`
(the branch touches no manifest or lockfile), and `security-check.sh --branch` is `BLOCKED 1`
on every run branch until they clear:

- critical — Next.js: Remote Code Execution in `next/og` — `next` `16.3.4` (`web/package.json`),
  vulnerable `>=16.2.0 <16.3.6`, patched `>=16.3.6`. `web/src` imports no `next/og` today.
- high ×2 — undici DoS via unrequested responses, and TLS certificate validation bypass — via
  `shadcn` → `undici` (vulnerable `<7.29.1`, patched `>=7.29.1`).
- high — undici DoS — via `@vercel/blob` → `undici` (vulnerable `>=6.7.0 <6.28.1`, patched
  `>=6.28.1`).

## Proposed change

Bump `next` to `>=16.3.6` (and `eslint-config-next` with it if pinned alongside), and lift the
transitive `undici` copies — upgrade `shadcn` / `@vercel/blob`, or a `pnpm.overrides` entry —
then `pnpm audit --audit-level=high` → nothing, and `security-check.sh --branch` → `OK`.

## Prompt

In the agorasim repo, read `.icm/intake/triage/dependency-advisories-next-undici.md`. Upgrade
`next` to a patched 16.3.x and lift both `undici` copies past their patched versions in `web/`,
regenerating `pnpm-lock.yaml` with pnpm (never by hand); prove it with
`.icm/scripts/security-check.sh <slug> --branch` → `RESULT: OK`. `git mv` the stub to `_done/`
in the PR, on a `claude/` branch; CI is the source of truth.
