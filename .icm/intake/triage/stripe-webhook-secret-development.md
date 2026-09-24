# Stub: STRIPE_WEBHOOK_SECRET is missing on Vercel's Development target

- lane: chore
- found-by: quote-page-and-deposit-link (Release readiness audit; waived by the operator) · 2026-09-24
- complexity: low

## Problem

`env.sh audit --changed` reports `STRIPE_WEBHOOK_SECRET` declared for production, preview and
development in `web/.env.example`, but set on Vercel (agorasim) only for Preview and
Production. Only `vercel dev` / `env.sh pull` read the Development target, so a local webhook
run has no secret and refuses every event (503).

## Proposed change

Either set a test-mode webhook secret on the Development target (the operator's value), or
narrow the key's declared scope in `web/.env.example` to production + preview if local webhook
runs are never wanted. `env.sh audit` → OK afterwards.

## Prompt

In the agorasim repo, read `.icm/intake/triage/stripe-webhook-secret-development.md`. With the
operator, either set `STRIPE_WEBHOOK_SECRET` on Vercel's Development target or narrow its scope
in `web/.env.example`; prove it with `.icm/scripts/env.sh audit` → `RESULT: OK`. `git mv` the
stub to `_done/` in the PR, on a `claude/` branch.
