# Stub: A superseded quote keeps its instalments open — a stale checkout could still pay it

- lane: bug
- found-by: admin-quote-builder (Release code review) · 2026-09-23
- complexity: medium

## Problem

`supersedeSentQuotes` (`web/src/lib/quotes.ts`) cancels the old quote but leaves its
`quote_payments` `pending`/`issued`, and `markPaymentPaid` guards only the payment's own status.
Unreachable today — nothing issues a Checkout session for a quote yet — but once
`quote-flow/quote-page-and-deposit-link` mints sessions, a couple finishing an old tab's checkout
after a new version was sent would pay a cancelled quote.

## Proposed change

Belongs with `quote-page-and-deposit-link`: cancel the superseded quote's unpaid instalments
(and expire any open session) in the same write, and have the webhook refuse a payment whose
quote is `cancelled` (refund path). Fold into that stub's spec at Define.

## Prompt

When defining `quote-flow/quote-page-and-deposit-link`, read
`.icm/intake/triage/superseded-quote-open-payments.md` and carry it as an acceptance criterion;
`git mv` this stub to `_done/` in that PR.
