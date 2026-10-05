# Spec: The tour and quote refund paths share one Stripe half

- slug: refund-paths-dedupe
- personas: team
- touches: web/src/lib/booking-refund.ts, web/src/lib/quote-refund.ts, web/src/components/admin/quote-refund-dialogs.tsx, web/src/components/admin/lead-quote-card.tsx, web/src/app/admin/sales/[id]/page.tsx
- complexity: standard

## Problem

The four correctness fixes of `quote-refund-hardening` (#164, #165, #166, #169) have landed, and
they leave the quote refund path a near-copy of the tour-booking one. `issueInstalmentRefund`
(`web/src/lib/quote-refund.ts`) repeats `issueRefund`'s Stripe half
(`web/src/lib/booking-refund.ts`) — retrieve the intent with its latest charge on the owning
account, decide `refund_application_fee` from the charge, create the refund under an idempotency
key — and `syncQuotePaymentRefundFromStripe` repeats `syncRefundFromStripe`'s prologue: the
payment-intent id off the charge, Stripe's refunded total, the proportional fee target, and the
"already synced" comparison. `sendRefundNotice` reads the instalment and then its quote in two
queries where one fresh read of the quote carries both, and the refund dialog
(`web/src/components/admin/quote-refund-dialogs.tsx`) recomputes the ceiling the sales page
already computes with `instalmentRefundableCents`. Two copies of money-moving code drift; this
advances contracted feature ⑥ hardening — money already collected on a quote settles correctly
under retries, races and stale reads — by leaving one copy to keep correct.

## Proposed change

A pure refactor — no behaviour change, no new user-visible text, no schema change.

1. **The issue half.** `booking-refund.ts` exports
   `refundPaymentIntent({ paymentIntentId, amountCents, metadata, idempotencyKey })`. Inside one
   `onOwningAccount` call it retrieves the intent with `latest_charge` expanded, creates the
   refund (`reason: "requested_by_customer"`, `refund_application_fee: true` only when the charge
   carries an application fee, the caller's `metadata`, the caller's full `idempotencyKey` on the
   owning account), and returns `{ refund, charge, account }` — `charge` being the expanded
   latest charge or `null`, `account` the request options the refund went out on. The caller
   passes the whole key, not a prefix: the booking key ends in the claim's moment
   (`booking-refund:<id>:<claimedAt>`), the quote key in the dialog's attempt id
   (`quote-refund:<id>:<attemptId>`), and both stay byte-identical to today.
   - `issueRefund` becomes a call to it, returning `refund`.
   - `issueInstalmentRefund` becomes a call to it, then reads the charge back with
     `readChargeAfterRefund` on the returned `account` (the charge's id from `charge`, else from
     the refund) — the read stays outside the `onOwningAccount` retry, so a failed read still
     cannot re-issue a refund on the platform.
2. **The sync prologue.** `booking-refund.ts` exports `chargeRefundState(charge)` returning
   `{ paymentIntentId, refundedAmountCents, feeTargetCents }` — the payment intent's id off the
   charge (string or expanded), `charge.amount_refunded`, and `proportionalFeeRefundCents` of the
   charge's application fee. `syncRefundFromStripe` and `syncQuotePaymentRefundFromStripe` both
   start from it. What follows the prologue — the booking's status rules, the quote card's
   deferral window, the settle — stays in each function as it is.
3. **The notice's read.** `sendRefundNotice` takes the quote's id beside the instalment's id and
   makes one fresh `getQuote` read, finding the instalment among `quote.payments`. It still reads
   after the write and any cancellation — the totals and "the event is off" are what is now true —
   and still returns quietly when either the quote or the instalment is not found.
4. **The dialog's ceiling.** The sales page computes `instalmentRefundableCents(payment)` once per
   instalment and passes it down: the lead quote card's payment shape gains
   `refundableCents: number`, its `refundable` flag reads off that same value, and
   `RefundQuotePaymentDialog` takes `refundableCents` as a prop in place of computing
   `amountCents − refundedAmountCents` itself. The dialog's default amount, its validation, its
   "máximo agora" line and its "empties the deposit" check all use the prop.

## Acceptance criteria

- [ ] `refundPaymentIntent` in `web/src/lib/booking-refund.ts` holds the only `refunds.create`
      call outside tests in `web/src/lib`; `issueRefund` and `issueInstalmentRefund` both call it
- [ ] Both idempotency keys are unchanged: `booking-refund:<bookingId>:<claimedAt ms>` and
      `quote-refund:<paymentId>:<attemptId>`, sent on the owning account
- [ ] `chargeRefundState` in `web/src/lib/booking-refund.ts` backs the prologue of both
      `syncRefundFromStripe` and `syncQuotePaymentRefundFromStripe`; neither computes the
      payment-intent id or the fee target on its own any more
- [ ] `sendRefundNotice` makes one quote read (`getQuote`) and no `getPayment` call; the couple's
      `quote-refunded` email carries the same fields and values as before
- [ ] `RefundQuotePaymentDialog` takes `refundableCents` as a prop and no longer subtracts
      `refundedAmountCents` from `amountCents`; the sales page computes it with
      `instalmentRefundableCents`
- [ ] No behaviour change: every existing test in `booking-refund.test.ts`,
      `quote-refund.test.ts` and `quotes.test.ts` passes without a single edit to those files, and
      CI is green on the full gate

## Out of scope

- Any change to what either refund path does — the four correctness fixes ahead of this in the
  epic are settled; this run only extracts the shape they left.
- Merging the two sync functions past their prologue (the booking's status rules and the quote
  card's deferral window and settle are genuinely different).
- Moving `proportionalFeeRefundCents`, `latestRefundId` or `topUpApplicationFee` out of
  `booking-refund.ts`, or creating a separate refund module.
- `returnApplicationFee` and the quote side's fee top-up (`quote-fee-refund:` key) — already
  shared through `topUpApplicationFee`.
- New tests: the existing suites are the proof that nothing moved.

## Open questions

- none
