# Stub: Three email keys are declared for Development but not set there on Vercel

- lane: chore
- found-by: thankyou-review-email (Release readiness audit — pre-existing, not added by the branch) · 2026-09-24
- complexity: low

## Problem

`env.sh audit --changed` on the thankyou-review-email branch reported `RESEND_API_KEY`,
`BOOKING_EMAIL_FROM` and `BOOKING_NOTIFICATION_EMAILS` (`web/.env.example:188/192/198`, no
`[targets]` line → declared for production, preview and development) as set on Vercel only for
Preview and Production. `CRON_SECRET` was narrowed by #152 (`:87`); the sibling
`stripe-webhook-secret-development` was fixed by #142 and retired on 2026-09-26.

## Proposed change

Narrow the three keys' declared scope in `web/.env.example` to `[production,preview]` — the
route #142 and #152 took — unless the operator wants Development test values. `env.sh audit` →
`RESULT: OK` afterwards.

## Prompt

In the agorasim repo, read `.icm/intake/triage/email-keys-development-target.md`. Narrow the
three keys' scope in `web/.env.example` (or set Development values with the operator); prove it
with `.icm/scripts/env.sh audit` → `RESULT: OK`. `git mv` the stub to `_done/` in the PR, on a
`claude/` branch.
