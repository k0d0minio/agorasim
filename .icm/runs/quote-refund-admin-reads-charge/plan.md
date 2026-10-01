# Plan: quote-refund-admin-reads-charge

Build's execution plan in passes — each pass one layer of the change, in the order it lands, so
a session that resumes mid-build sees where it is. Written by the advisor pass (Define, or
Build's first act on `sonnet` after reading the spec), executed pass by pass, and rewritten when
reality disagrees with it — never left describing a plan that was abandoned.

## Passes

1. **Read Stripe's total after the refund** — `web/src/lib/quote-refund.ts`,
   `issueInstalmentRefund` — after `refunds.create` succeeds, read the charge back on the same
   owning account (`client.charges.retrieve(<charge id>, {}, account)` — the id from the
   pre-refund `latest_charge`, else `refund.charge`). Wrap only that read in its own
   try/catch: a failed read returns `{ refund, charge: <the pre-refund charge>, settledFrom:
   "sum" }`, a successful one `{ refund, charge: <fresh charge>, settledFrom: "charge" }`, and
   must never reach the outer catch in `refundQuotePayment` (that would report `refund-failed`
   for money that did go back). Keep the existing idempotency key untouched (stub 4 owns it).
   — done when: the function returns the post-refund charge, or the fallback marker on a read
   failure.
2. **Settle from it** — `refundQuotePayment` — `refundedAmountCents` = the fresh charge's
   `amount_refunded` when read, else `payment.refundedAmountCents + refund.amount` with a
   `console.warn`/`console.error` naming the quote ref and that the echo will correct it. Pass
   the fresh charge into `settleInstalmentRefund` (fee arithmetic + audit ids). Leave
   `refundedCents: refund.amount` in the outcome. Update the comment at the call site and, if
   needed, the module header's "set to the charge" bullet so it is true of both doors.
   `settleInstalmentRefund` and `sendRefundNotice` need no change: the notice's "refunded now"
   is already `refundedAmountCents − payment.refundedAmountCents`. — done when: the existing
   suite passes unchanged.
3. **Tests** — `web/src/lib/quote-refund.test.ts` — the Stripe stand-in gains
   `charges.retrieve` returning the charge with `amount_refunded` = the earlier (unsynced)
   refunds + every refund created so far; an existing-suite default where it simply mirrors the
   refunds created keeps the current tests green without assertion edits. New cases in the
   `refundQuotePayment` describe: (a) stale row — Stripe already holds an earlier dashboard
   refund the row lacks; the admin refund sets the row to Stripe's total, status follows it,
   the fee target is the proportion of that total, exactly one `quote-refunded` notice with the
   right `refundedTotalCents` and "refunded now", outcome `refundedCents` = this refund; then
   `syncQuotePaymentRefundFromStripe` with the same charge → `already-synced`, no second
   notice. (b) failed read — `charges.retrieve` rejects; outcome `refunded`, row = old + this
   refund, the fallback logged. — done when: both cases pass on CI.

## Risks

- `refunds.create` returned but the read lands before Stripe reflects it — the charge read is
  synchronous after a successful create, but if a test or Stripe returns a total **below**
  `row + refund.amount`, do not invent a max(); settle from Stripe's figure as the spec says and
  let the existing "follows down" path log it. Signal: a test that expects the sum.
- The read throwing into `refundQuotePayment`'s outer catch → a `refund-failed` toast for money
  that went back. Signal: case (b) reporting `refund-failed`.
- Over-mocking: the in-memory `recordPaymentRefund` keeps its compare-and-set — keep using it so
  the echo case is the real convergence, not a stubbed one.
