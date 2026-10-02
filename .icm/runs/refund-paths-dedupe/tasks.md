# Tasks: refund-paths-dedupe

The queue, with a definition of done per item. Ticked by the stage that finishes the item —
a human checkbox, never a script's. The definition of done is seeded from the spec's
acceptance criteria when the run is opened; the queue is Build's own, one line per commit-sized
step, so a resuming session can pick up the first unticked line.

## Definition of done

- [ ] `refundPaymentIntent` in `web/src/lib/booking-refund.ts` holds the only `refunds.create`
- [ ] Both idempotency keys are unchanged: `booking-refund:<bookingId>:<claimedAt ms>` and
- [ ] `chargeRefundState` in `web/src/lib/booking-refund.ts` backs the prologue of both
- [ ] `sendRefundNotice` makes one quote read (`getQuote`) and no `getPayment` call; the couple's
- [ ] `RefundQuotePaymentDialog` takes `refundableCents` as a prop and no longer subtracts
- [ ] No behaviour change: every existing test in `booking-refund.test.ts`,

## Queue

- [ ] <task — small enough for one commit; name the file or area>
