# Stub: The Resend call has no timeout, and the webhook awaits it

- lane: bug
- found-by: tech lens (/project) · 2026-09-18
- priority: P2

## Problem

`web/src/lib/email.ts:103` fetches Resend with no abort signal; every caller awaits it,
including the paid path inside the Stripe webhook (`booking-checkout.ts:685`). A hung Resend
holds the function until the platform kills it; on the webhook the `status='pending'` flip
has already happened, so Stripe's retry finds nothing pending and the confirmation is never
sent. The webhook route exports no `maxDuration`.

## Proposed change

`signal: AbortSignal.timeout(8_000)` on the fetch, reported through the existing
`captureError` path as a failed send; consider `maxDuration` on the webhook route.

## Prompt

In the agorasim repo (`web/`), read `.icm/intake/triage/resend-fetch-timeout.md`, add the
timeout to `src/lib/email.ts` and test that a timed-out send returns the failed result
rather than throwing. `git mv` the stub to `_done/` in the PR, on a `claude/` branch; CI is
the source of truth.
