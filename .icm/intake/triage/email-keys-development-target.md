# Stub: Four email/cron keys are declared for Development but not set there on Vercel

- lane: chore
- found-by: thankyou-review-email (Release readiness audit — pre-existing, not added by the branch) · 2026-09-24
- complexity: low

## Problem

`env.sh audit --changed` on the thankyou-review-email branch reported `RESEND_API_KEY`,
`BOOKING_EMAIL_FROM`, `BOOKING_NOTIFICATION_EMAILS` and `CRON_SECRET` declared for
production, preview and development in `web/.env.example` but set on Vercel (agorasim) only for
Preview and Production. The branch did not add them; the audit listed them because files that
read them changed. Same class as `stripe-webhook-secret-development.md`.

## Proposed change

With the operator: set test values on the Development target, or narrow each key's declared
scope in `web/.env.example` to `[production,preview]`. `env.sh audit` → `RESULT: OK` afterwards.
Consider doing this together with `stripe-webhook-secret-development.md`.

## Prompt

In the agorasim repo, read `.icm/intake/triage/email-keys-development-target.md`. With the
operator, either set the four keys on Vercel's Development target or narrow their scope in
`web/.env.example`; prove it with `.icm/scripts/env.sh audit` → `RESULT: OK`. `git mv` the stub
to `_done/` in the PR, on a `claude/` branch.
