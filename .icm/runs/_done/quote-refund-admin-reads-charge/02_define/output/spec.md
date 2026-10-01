# Spec: The admin quote refund settles from Stripe's cumulative total, not the row's running sum

- slug: quote-refund-admin-reads-charge
- personas: team, operator
- touches: web/src/lib/quote-refund.ts, web/src/lib/quote-refund.test.ts
- complexity: standard

## Problem

Contracted feature ⑥ (weddings and events money) promises that money already collected on a
quote settles correctly under retries, races and stale reads. The quote card's **Reembolsar**
(`refundQuotePayment`, `web/src/lib/quote-refund.ts`) breaks that on a stale row: it records
the instalment's refunded total as `payment.refundedAmountCents + refund.amount`. If an
earlier refund made in the Stripe dashboard never reached the webhook, the row is behind
Stripe, so the admin refund writes a total lower than what has really gone back, the couple's
notice quotes that wrong total, and the later webhook echo — which reads Stripe's true
`amount_refunded` — moves the row again and sends the couple a second notice for the gap.

The module's own header promises the opposite ("set to the charge, never added to"); the
dashboard door already honours it, the admin door does not.

## Proposed change

After Stripe accepts the admin refund, the instalment is settled from **Stripe's own
cumulative refunded total for the charge, read after the refund** — the same number the
webhook echo will carry — instead of the row's figure plus this refund. Everything downstream
of the settle (the compare-and-set write, the proportional commission top-up, the audit row,
the cancellation the operator asked for, the couple's notice) is unchanged and simply works
from the right total.

- **Stale row (an earlier refund was never synced).** The row is set to Stripe's total, which
  includes the missed refund. The commission top-up targets the proportion of that total.
- **The couple's notice.** One notice, keyed (as today) on the instalment and the settled
  total. Its "refunded now" amount is everything newly recorded — Stripe's total minus what the
  row last held, i.e. the missed refund plus this one — and its "total refunded" reflects
  Stripe's total. The webhook echo then finds the row already at Stripe's figure and sends
  nothing (decided with the operator in Define, 2026-10-01).
- **The admin's own read-back.** `refundedCents` in the outcome (what the Sales board says went
  back "this time") stays the amount of this refund, not the gap.
- **The read fails.** If Stripe's figure cannot be read after the refund has been issued, the
  refund is not undone and the outcome is not an error: the settle falls back to today's
  arithmetic (row + this refund), logs that it did, and the webhook echo corrects the row
  afterwards as it does now.
- **The charge used for the commission** is the one read after the refund, so the fee
  arithmetic and the audit row's ids come from the same Stripe object as the total.

## Acceptance criteria

- [ ] A refund issued while the row is stale (an earlier refund on the same charge never
      synced) sets the instalment's refunded amount to Stripe's cumulative `amount_refunded`
      after the refund, not the row's figure plus this refund
- [ ] The instalment's status follows that settled total (`refunded` when Stripe's total
      covers the whole instalment, `paid` otherwise), and the commission top-up targets the
      proportion of that total
- [ ] The couple receive exactly one notice: its refunded total is Stripe's total and its
      "refunded now" amount is Stripe's total minus what the row held before; the webhook echo
      of the same refund that follows sends no second notice
- [ ] The admin outcome's `refundedCents` is still the amount of this refund
- [ ] When the post-refund read of Stripe's total fails, the refund still reports `refunded`,
      the instalment is settled from the row's figure plus this refund, and the fallback is
      logged
- [ ] With a row already in step with Stripe (the normal case), behaviour is unchanged — the
      existing `refundQuotePayment` and notice tests pass without edits to their assertions
- [ ] New tests in `web/src/lib/quote-refund.test.ts` cover the stale-row case (settled total,
      one notice, silent echo) and the failed-read fallback; CI green

## Out of scope

- The idempotency key (`quote-refund:<id>:<row's refunded total>:<amount>`) still keys on the
  row's figure — reworking it is stub 4 of this epic, `refund-idempotency-cached-declines`.
- The ceiling the dialog offers (`instalmentRefundableCents`) is still computed from the row,
  so on a stale row it can offer more than Stripe has left; Stripe refuses an over-ceiling
  refund and the action reports `refund-failed`, writing nothing. Not changed here.
- The race where the webhook echo claims the row before the admin settle (stub 3,
  `quote-refund-echo-race`) and database errors after the refund (stub 2,
  `quote-refund-guard-post-refund-writes`).
- The tour refund path (`booking-refund.ts`).
- The webhook trusting a `charge.refunded` event's own charge snapshot, so a late or
  out-of-order delivery can pull a row back below Stripe's real total — pre-existing on both
  paths; parked as `.icm/intake/triage/refund-webhook-stale-charge-snapshot.md`.

## Open questions

- none
