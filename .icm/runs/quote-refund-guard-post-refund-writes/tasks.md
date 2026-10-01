# Tasks: quote-refund-guard-post-refund-writes

The queue, with a definition of done per item. Ticked by the stage that finishes the item —
a human checkbox, never a script's. The definition of done is seeded from the spec's
acceptance criteria when the run is opened; the queue is Build's own, one line per commit-sized
step, so a resuming session can pick up the first unticked line.

## Definition of done

- [x] When `refunds.create` succeeds and a later write in the settle step throws (the refund
- [x] That case logs one `console.error` naming the quote ref, the instalment, the refund id,
- [x] Nothing more is attempted after the caught error: no retried write and no separate
- [x] `refundLeadQuotePayment` maps the outcome to an `ok` state that closes the dialog and
- [x] The warning says the refund of the amount reached Stripe, the records will be corrected
- [x] Every existing outcome (`refunded`, `not-found`, `not-refundable`, `amount-invalid`,
- [ ] `web/src/lib/quote-refund.test.ts` gains a test that forces the post-refund write to fail

## Queue

- [x] quote-refund.ts — `refunded-unrecorded` outcome, guard around the settle step (1da2f65)
- [x] quote-refund.test.ts — the forced post-refund failures (1da2f65)
- [x] sales/actions.ts + quote-refund-dialogs.tsx — ok + red warning (1da2f65)
- [ ] flip ready, settle the full gate
