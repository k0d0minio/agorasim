# Stub: A charge.refunded echo is attributed to the charge's newest refund, not the one that fired it

- lane: bug
- found-by: quote-refund-echo-race (Release code review) · 2026-10-01
- complexity: medium
- priority: P2

## Problem

`refundBehind` in `web/src/lib/quote-refund.ts` reads the charge's latest refund for a
`charge.refunded` event (it carries none). With two refunds close together on one instalment,
a dashboard refund's event can be deferred because an admin refund landed after it, or an admin
refund's echo can go undeferred because a dashboard refund landed after it — the race this
deferral closes then reopens for that refund.

## Proposed change

Investigate: attribute by matching the amount Stripe added since the row's total
(`charge.amount_refunded - payment.refundedAmountCents`) against the charge's recent refunds,
and defer only when an unrecorded admin refund is among them.

## Prompt

In the agorasim repo, read `.icm/intake/triage/quote-refund-echo-latest-refund-attribution.md`
and `refundBehind` / `syncQuotePaymentRefundFromStripe` in `web/src/lib/quote-refund.ts`. Make
the deferral consider every refund the row has not recorded, not only the latest; test both
interleavings. `git mv` this stub to `_done/` in the PR, on a `claude/` branch; CI is the source
of truth.
