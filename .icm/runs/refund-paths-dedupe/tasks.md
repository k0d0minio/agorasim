# Tasks: refund-paths-dedupe

The queue, with a definition of done per item. Ticked by the stage that finishes the item —
a human checkbox, never a script's. The definition of done is seeded from the spec's
acceptance criteria when the run is opened; the queue is Build's own, one line per commit-sized
step, so a resuming session can pick up the first unticked line.

## Definition of done

- [x] `refundPaymentIntent` in `web/src/lib/booking-refund.ts` holds the only `refunds.create`
- [x] Both idempotency keys are unchanged: `booking-refund:<bookingId>:<claimedAt ms>` and
- [x] `chargeRefundState` in `web/src/lib/booking-refund.ts` backs the prologue of both
- [x] `sendRefundNotice` makes one quote read (`getQuote`) and no `getPayment` call; the couple's
- [x] `RefundQuotePaymentDialog` takes `refundableCents` as a prop and no longer subtracts
- [x] No behaviour change: every existing test in `booking-refund.test.ts`, — Quality (advisory) pass on 707e61c

## Queue

- [x] Issue half — `refundPaymentIntent` in `booking-refund.ts`; `issueRefund` and `issueInstalmentRefund` on it
- [x] Sync prologue — `chargeRefundState` in `booking-refund.ts`; both sync functions on it
- [x] Notice — `sendRefundNotice` takes `quoteId`, one `getQuote`
- [x] Dialog ceiling — sales page → lead quote card → `refundableCents` prop
- [x] Ready flip + full gate GREEN (test files untouched)
