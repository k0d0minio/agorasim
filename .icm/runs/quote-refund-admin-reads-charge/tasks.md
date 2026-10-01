# Tasks: quote-refund-admin-reads-charge

The queue, with a definition of done per item. Ticked by the stage that finishes the item —
a human checkbox, never a script's. The definition of done is seeded from the spec's
acceptance criteria when the run is opened; the queue is Build's own, one line per commit-sized
step, so a resuming session can pick up the first unticked line.

## Definition of done

- [x] A stale-row admin refund sets the instalment's refunded amount to Stripe's cumulative `amount_refunded` after the refund, not row + this refund
- [x] The instalment's status and the commission top-up follow that settled total
- [x] Exactly one notice: total = Stripe's total, "refunded now" = Stripe's total − the row's prior figure; the echo sends nothing
- [x] The admin outcome's `refundedCents` is still the amount of this refund
- [x] A failed post-refund read still reports `refunded`, settles from row + this refund, and logs the fallback
- [x] In-step rows behave as today — existing assertions unedited
- [x] New tests cover the stale-row case and the failed-read fallback; CI green

## Queue

- [x] Pass 1 — read the charge back after `refunds.create` in `issueInstalmentRefund` (web/src/lib/quote-refund.ts)
- [x] Pass 2 — settle `refundQuotePayment` from it, with the logged fallback
- [x] Pass 3 — stale-row and failed-read tests (web/src/lib/quote-refund.test.ts)
