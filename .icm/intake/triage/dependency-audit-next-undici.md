# Stub: pnpm audit reports a critical Next.js advisory and three high undici ones

- lane: chore
- found-by: security-check · 2026-10-01 (quote-refund-guard-post-refund-writes Build, `--branch` gate — pre-existing on `main`, the branch changes no manifest or lockfile)
- complexity: low

## Problem

`security-check.sh --branch` blocks on `dependency-audit`: `pnpm audit --audit-level=high` in
`web/` reports 1 critical and 3 high advisories, all present on `main`:

- **critical** — `next` "Remote Code Execution in next/og", vulnerable `>=16.2.0 <16.3.6`,
  patched `>=16.3.6`. `web/package.json` pins `"next": "16.3.4"`.
- **high** ×3 — `undici` (transitive): DoS via unrequested responses (`>=7.0.0 <7.29.1` and
  `>=6.7.0 <6.28.1`), TLS certificate validation bypass (`>=7.24.1 <7.29.1`); patched
  `>=7.29.1` / `>=6.28.1`.

Every spine run's Build `--branch` gate and Release stop class 2 will block on this until it is
fixed on `main`.

## Proposed change

Bump `next` to `>=16.3.6` (and `eslint-config-next` to match, if pinned alongside), and lift
`undici` to the patched lines — through the parent that pulls it in, or a `pnpm.overrides`
entry if the parent has no patched release. Regenerate the lockfile with pnpm, never by hand.
`pnpm audit --audit-level=high` → no high or critical; `security-check.sh --all --audit` → `OK`.

## Prompt

In the agorasim repo, read `.icm/intake/triage/dependency-audit-next-undici.md`. Bump `next`
past the critical advisory and lift `undici` to its patched lines, regenerating
`web/pnpm-lock.yaml` with pnpm; prove it with `pnpm audit --audit-level=high` and
`.icm/scripts/security-check.sh --all --audit` → `RESULT: OK`. `git mv` the stub to `_done/`
in the PR, on a `claude/` branch; CI is the source of truth.
