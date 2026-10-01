# Tasks: quote-refund-admin-reads-charge

The queue, with a definition of done per item. Ticked by the stage that finishes the item —
a human checkbox, never a script's. The definition of done is seeded from the spec's
acceptance criteria when the run is opened; the queue is Build's own, one line per commit-sized
step, so a resuming session can pick up the first unticked line.

## Definition of done

- [ ] A refund issued while the row is stale (an earlier refund on the same charge never
- [ ] The instalment's status follows that settled total (`refunded` when Stripe's total
- [ ] The couple receive exactly one notice: its refunded total is Stripe's total and its
- [ ] The admin outcome's `refundedCents` is still the amount of this refund
- [ ] When the post-refund read of Stripe's total fails, the refund still reports `refunded`,
- [ ] With a row already in step with Stripe (the normal case), behaviour is unchanged — the
- [ ] New tests in `web/src/lib/quote-refund.test.ts` cover the stale-row case (settled total,

## Queue

- [ ] <task — small enough for one commit; name the file or area>
