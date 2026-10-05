# Stub: `braces` high advisory through the ESLint chain blocks `security-check.sh --branch`

- lane: chore
- found-by: build refund-paths-dedupe · security-check.sh --branch · 2026-10-05
- complexity: low
- priority: P2

## Problem

`pnpm audit --audit-level=high` in `web/` reports one high advisory: `braces` <=3.0.3,
stack-exhaustion DoS on deeply nested patterns (GHSA-vfj7-8cjw-p6xm), patched versions
`<0.0.0` (no fix published). Path: `eslint-config-next > @next/eslint-plugin-next > fast-glob >
micromatch > braces` — dev tooling only, never in the server bundle. Every run's
`security-check.sh --branch` and Release's `--audit` read report `BLOCKED 1` for it while
`main` carries it.

## Proposed change

Investigate: a `pnpm.overrides` pin to a `braces` version outside the advisory range if one
exists, an `eslint-config-next` bump that drops the path, or a recorded waiver for a dev-only
advisory with no upstream fix.
