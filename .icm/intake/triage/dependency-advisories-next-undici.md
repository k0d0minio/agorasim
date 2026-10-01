# Stub: Bump next and undici past the high/critical advisories pnpm audit reports

- lane: chore
- found-by: security-check · quote-refund-admin-reads-charge Build · 2026-10-01
- complexity: low
- priority: P1

## Problem

`security-check.sh --branch` → `BLOCKED 1` on `dependency-audit`: `pnpm audit --audit-level=high`
in `web/` reports 1 critical and 3 high, none introduced by a run's own change —
`next` 16.3.4 (critical, GHSA-vcvr-r3jv-pc5j, RCE in `next/og` `ImageResponse`; patched
>=16.3.6 — `web/src` does not import `next/og` today, so not reachable by app code), and
`undici` via `shadcn` (<7.29.1: GHSA-rfgv-xxqx-mfg5 DoS, GHSA-w293-vg96-wgc3 TLS bypass) and via
`@vercel/blob` (<6.28.1: GHSA-rfgv-xxqx-mfg5). Every branch's gate reports it until main moves.

## Proposed change

Bump `next` to >=16.3.6 in `web/package.json`; bring `undici` to the patched lines (dependency
bumps of `shadcn` / `@vercel/blob`, or a `pnpm.overrides` entry); regenerate the lockfile with
pnpm, never by hand.

## Prompt

In the agorasim repo (`web/`), read `.icm/intake/triage/dependency-advisories-next-undici.md`.
Bump `next` to the patched release and lift `undici` past the advisories with pnpm, then
confirm `.icm/scripts/security-check.sh --branch` passes the dependency audit. `git mv` the
stub to `_done/` in the PR, on a `claude/` branch; CI is the source of truth.
