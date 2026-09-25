# Stub: Cancelling an event leaves its open balance Checkout session payable

- lane: bug
- found-by: quote-refunds · Release code review · 2026-09-24
- complexity: low

## Problem

`cancelQuoteAndOpenInstalments` (`web/src/lib/quotes.ts`) writes off `issued` instalments but
never expires their Stripe Checkout session; a couple with the T−14 balance page open can still
pay a cancelled event, which `recordQuotePayment` only alerts on.

## Proposed change

Expire each written-off instalment's `stripeSessionId` at Stripe (the `expireSession` helper in
`web/src/lib/quote-checkout.ts`) as part of the cancellation, best-effort, on the owning account.

## Prompt

In the agorasim repo, read `.icm/intake/triage/quote-cancel-expire-open-sessions.md`. Expire the
open Checkout sessions of instalments written off by a quote cancellation, with a test; PR on a
`claude/` branch; CI is the source of truth.
