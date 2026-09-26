# Stub: The tour and quote refund paths copy each other's Stripe half

- lane: chore
- found-by: quote-refunds · Release code review · 2026-09-24
- complexity: low
- superseded-by: quote-refund-hardening/refund-paths-dedupe.md — batched with the other quote-refunds findings, same file surface

## Problem

`issueInstalmentRefund` and `syncQuotePaymentRefundFromStripe` (`web/src/lib/quote-refund.ts`)
repeat `issueRefund` / `syncRefundFromStripe`'s skeleton from `web/src/lib/booking-refund.ts`;
`sendRefundNotice` re-reads the quote it already has via `getPayment` then `getQuote`; the refund
dialog (`web/src/components/admin/quote-refund-dialogs.tsx`) recomputes the ceiling the page
already computes with `instalmentRefundableCents`.

## Proposed change

Extract a shared `refundPaymentIntent({ paymentIntentId, amountCents, metadata, keyPrefix })`,
drop the extra read in the notice, and pass `refundableCents` to the dialog as a prop. No
behaviour change.

## Prompt

In the agorasim repo, read `.icm/intake/triage/refund-paths-dedupe.md`. Do the three
de-duplications with no behaviour change; existing tests stay green; PR on a `claude/` branch.
