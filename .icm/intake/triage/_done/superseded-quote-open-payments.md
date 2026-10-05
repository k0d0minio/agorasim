# Stub: A superseded quote keeps its instalments open — a stale checkout could still pay it

- lane: bug
- found-by: admin-quote-builder (Release code review) · 2026-09-23 — re-cut 2026-09-26 (estate audit)
- priority: P1
- complexity: medium

## Problem

`supersedeSentQuotes` (`web/src/lib/quotes.ts:1237-1267`) cancels the old quote but leaves its
`quote_payments` `pending`/`issued`, and `markPaymentPaid` guards only the payment's own status.
This is reachable now: `quote-checkout.ts` mints Checkout sessions, and on a payment against a
cancelled quote it only alerts "paid on a cancelled quote — needs a human" (`:466`). A couple
finishing an old tab's checkout after a new version was sent pays a cancelled quote and an admin
has to unwind it by hand. The fold-in this stub once pointed at
(`quote-flow/quote-page-and-deposit-link`) is archived without it.

## Proposed change

In `supersedeSentQuotes`' write: cancel the superseded quote's unpaid instalments and expire any
open Checkout session for them — `cancelQuoteAndOpenInstalments` (`quotes.ts:1337`) and
`expireWrittenOffSessions` (#159) are the reusable halves; have the webhook refuse (refund) a
payment whose quote is `cancelled` instead of alerting. One bug run.
