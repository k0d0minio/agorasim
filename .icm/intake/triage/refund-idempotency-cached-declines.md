# Stub: Refund idempotency keys replay a cached Stripe decline on "try again"

- lane: bug
- found-by: quote-refunds · Release code review · 2026-09-24
- complexity: medium

## Problem

Both refund paths key `refunds.create` on (row, refunded so far, amount) — `booking-refund:` in
`web/src/lib/booking-refund.ts` and `quote-refund:` in `web/src/lib/quote-refund.ts`. Stripe caches
a declined request (e.g. `balance_insufficient`) against the key for 24h, so the admin's advised
retry returns the same error, and a refund re-issued after an earlier one failed can return the old
failed refund.

## Proposed change

Investigate: add a per-attempt nonce carried by the form (so a double submit still collapses) or
key on the submission, and treat a returned `failed` refund as a reason to retry with a new key.

## Prompt

In the agorasim repo, read `.icm/intake/triage/refund-idempotency-cached-declines.md`. Rework the
refund idempotency keys for tours and quote instalments so a double submit collapses but a
deliberate retry reaches Stripe; tests on both paths; PR on a `claude/` branch.
