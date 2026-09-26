# Stub: The admin quote refund adds to the row instead of reading Stripe's cumulative total

- lane: bug
- found-by: quote-refunds · Release code review · 2026-09-24
- complexity: low
- superseded-by: quote-refund-hardening/quote-refund-admin-reads-charge.md — batched with the other quote-refunds findings, same file surface

## Problem

`refundQuotePayment` (`web/src/lib/quote-refund.ts`) sets the instalment to
`payment.refundedAmountCents + refund.amount`. If an earlier dashboard refund's webhook was missed,
the row and the ceiling are stale, the notice is keyed and worded on the wrong total, and the later
echo sends a second notice for the gap.

## Proposed change

After `refunds.create`, re-read the charge on the owning account and settle from its
`amount_refunded` (falling back to the sum only when the read fails).

## Prompt

In the agorasim repo, read `.icm/intake/triage/quote-refund-admin-reads-charge.md`. Settle the
admin refund from the charge's cumulative `amount_refunded`, with a test for a stale row; PR on a
`claude/` branch; CI is the source of truth.
