# Plan: refund-paths-dedupe

Build's execution plan in passes — each pass one layer of the change, in the order it lands, so
a session that resumes mid-build sees where it is. Written by the advisor pass (Define, or
Build's first act on `sonnet` after reading the spec), executed pass by pass, and rewritten when
reality disagrees with it — never left describing a plan that was abandoned.

## Passes

1. **The issue half** — `web/src/lib/booking-refund.ts`: add and export
   `refundPaymentIntent({ paymentIntentId, amountCents, metadata, idempotencyKey })` returning
   `{ refund, charge, account }`, lifted from `issueRefund`'s `onOwningAccount` body (keep the
   "both calls go to whichever account took the money" and §6 proportional-fee comments with
   it). `issueRefund` calls it with `booking-refund:${booking.id}:${claimedAt(booking)}` and
   returns `refund`. Then `web/src/lib/quote-refund.ts`: `issueInstalmentRefund` calls it with
   `quote-refund:${payment.id}:${attemptId}` and runs `readChargeAfterRefund(stripe(),
   charge?.id ?? chargeIdOf(refund), account)` after it returns — outside the owning-account
   retry. Note `claimedAt` throws before any Stripe call: compute the key before calling the
   helper. — done when: one `refunds.create` in `web/src/lib` outside tests; both keys
   byte-identical (grep).
2. **The sync prologue** — `booking-refund.ts`: add and export `chargeRefundState(charge)` →
   `{ paymentIntentId, refundedAmountCents, feeTargetCents }`. `syncRefundFromStripe` and
   `syncQuotePaymentRefundFromStripe` destructure it in place of their own three computations;
   everything after the "already synced" check is untouched. — done when: neither sync function
   reads `charge.payment_intent` or calls `proportionalFeeRefundCents` directly.
3. **The notice's read** — `quote-refund.ts`: `sendRefundNotice` gains `quoteId`, drops
   `getPayment`, makes one `getQuote(quoteId)` and finds the instalment in `quote.payments` by
   id (return quietly when either is missing); `settleInstalmentRefund` passes `quote.id`. Drop
   `getPayment` from the import only if nothing else in the file still uses it
   (`settleInstalmentRefund` and `refundQuotePayment` do — check). — done when: the notice body
   has no `getPayment` call.
4. **The dialog's ceiling** — `web/src/app/admin/sales/[id]/page.tsx` computes
   `instalmentRefundableCents(payment)` once per instalment into `refundableCents` and derives
   `refundable` from it; `web/src/components/admin/lead-quote-card.tsx` adds `refundableCents:
   number` to its payment shape and passes it to the dialog;
   `web/src/components/admin/quote-refund-dialogs.tsx` takes `refundableCents` as a prop and
   renames its local uses. — done when: the dialog has no `amountCents - refundedAmountCents`.
5. **Prove it** — `.icm/scripts/format.sh` / `lint.sh` on the changed files, push, flip ready,
   `ci-status.sh refund-paths-dedupe` → `GREEN` with the three test files untouched
   (`git diff --stat origin/main -- '*.test.ts'` empty).

## Risks

- **A test mock that sees a different call shape.** `quote-refund.test.ts` mocks `@/lib/stripe`
  and imports `booking-refund.ts` for real; the helper must call `stripe()` and
  `onOwningAccount` exactly as today (same arguments, same order). Signal: a red test — fix the
  helper, never the test (AC: the test files take no edit).
- **The charge read-back moving inside the retry.** If `readChargeAfterRefund` ended up inside
  `onOwningAccount`, behaviour is unchanged only because it never throws; keep it outside anyway
  so the invariant does not rest on that.
- **The booking key losing its throw-before-Stripe.** `claimedAt` refuses an unclaimed row
  before any Stripe call; computing the key inside the helper's callback would still throw, but
  after `paymentIntents.retrieve`. Compute it first.
