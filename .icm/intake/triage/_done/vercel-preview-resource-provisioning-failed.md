# Stub: Vercel preview builds fail with "Resource provisioning failed" on every branch

- lane: chore
- found-by: fix-superseded-quote-open-payments (bug lane, ci-status.sh RED) · 2026-10-02
- complexity: low

## Problem

The blocking `Vercel` check is red with `BUILD_FAILED — Resource provisioning failed` (build dies
in ~1s, no build log) on every branch pushed around 2026-10-02, including unrelated draft PRs
(`claude/quirky-turing-6ym2t1`, `claude/peaceful-carson-et6xce`, `claude/lucid-hamilton-0aft93`)
and stub-only commits. Not caused by any diff; likely the preview database/Neon resource
integration.

## Proposed change

Operator: open a failing deployment in the Vercel dashboard (kodominio/agorasim) and check the
Neon integration / storage resource provisioning for previews; redeploy once fixed.

## Prompt

Operator-only (Vercel dashboard). Once resolved, `git mv` this stub to `_done/`.

> Dropped: resolved on its own — Vercel previews built again on the next push (2026-10-05).
