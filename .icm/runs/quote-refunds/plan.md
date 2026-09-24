# Plan: quote-refunds

Build's execution plan in passes — each pass one layer of the change, in the order it lands, so
a session that resumes mid-build sees where it is. Written by the advisor pass (Define, or
Build's first act on `sonnet` after reading the spec), executed pass by pass, and rewritten when
reality disagrees with it — never left describing a plan that was abandoned.

## Passes

1. **Schema and migration** — ✅ `web/src/db/schema.ts` (`messageKindEnum` gains `quote-refunded`
   on the end) and `web/drizzle/0029_quote_refunds.sql`. *Rewritten at Build:* the refund
   email is keyed on `message_log.quote_payment_id` + `refunded_total_cents` (D-3), not a
   Stripe refund id; the receipt index is narrowed with `quote_payment_id is null`, never
   widened. Load the
   `database-migration` skill first. Done when: `check-migrations.sh` is OK and the journal
   carries the new entry.
2. ✅ **Instalment reconciler** — `web/src/lib/quotes.ts` + `web/src/lib/booking-refund.ts`.
   Rework `recordPaymentRefund` into set-to-charge-truth with a compare-and-set on the amount
   read, `refunded` only when the whole instalment went back, and no status walk-back. Add a
   `syncQuotePaymentRefundFromStripe` (or generalise `syncRefundFromStripe` over both tables)
   that reuses `proportionalFeeRefundCents`, `returnApplicationFee` (with its idempotency key
   namespaced `quote-fee-refund:<paymentId>:<target>`) and `latestRefundId`. Done when: unit
   tests cover full, partial, redelivery, a lower amount and the fee top-up over instalment
   fixtures.
3. ✅ **Admin refund path** — `refundQuotePayment({ paymentId, refundCents, cancelEvent,
   actorUserId })` in `lib/booking-refund.ts` (or a sibling `lib/quote-refund.ts`), returning
   an outcome union like `CancelRefundOutcome`. It refuses a non-`paid` instalment, a missing
   payment intent, Stripe off, or an amount ≤ 0 or over the ceiling. It issues the refund on the
   owning account with `refund_application_fee` when a fee was taken and an idempotency key on
   (paymentId, refunded-so-far, amount), then reconciles the row. With `cancelEvent`, it calls
   `cancelQuote` and writes off the open instalments, only after the refund succeeds. It writes
   the audit rows. Done when: its tests pass for full, partial, refusals, the idempotency key,
   cancel-with-refund and refund-fails-cancels-nothing.
4. ✅ **Webhook branch** — `web/src/app/api/stripe/webhook/route.ts`: on `unknown-charge` from the
   booking reconciler, try the instalment reconciler before alerting. Update the module note
   that says quote refunds are not handled yet. Done when: `route.quote.test.ts` covers the
   quote refund events and `route.test.ts`'s tour refund cases are unchanged and green.
5. ✅ **Email** — `web/src/content/emails.ts` gains the PT/EN `quote-refunded` template (quote
   ref, event date, instalment, amount this time, total refunded, event cancelled or not).
   `lib/message-log.ts` sends it once per (instalment, refunded total) — D-3. It is called from the reconciler
   whenever a sync moved the amount up, so the admin path and the dashboard path share one
   sender, and the admin's echo finds the claim. Done when: tests assert one send per refund,
   none on redelivery or echo, and a second send on a second partial refund.
6. ✅ **Admin UI** — `web/src/app/admin/sales/actions.ts` gains `refundQuotePayment` and
   `cancelHeldQuote` server actions (admin-gated, plain PT errors).
   `web/src/components/admin/lead-quote-card.tsx` gets the Reembolsar button on paid Stripe
   instalments, a `refund-quote-payment-dialog.tsx` modelled on `cancel-booking-dialog.tsx`
   (amount field, read-back, the "Cancelar também o evento" box defaulted per the spec, typed
   `REEMBOLSAR`), refunded amounts on each row, and the fully-refunded-deposit warning with its
   Cancelar evento action. PT strings come from `.icm/docs/admin-pt-inventory.md`. Done when:
   lint.sh is clean on the changed files and the preview shows the dialog on a paid sandbox
   deposit.

## Risks

- The message-log key: widening `message_log_quote_receipt_key` would break the deposit and
  balance receipts' once-only rule. Signal: a receipt test sends twice.
- The admin refund and its webhook echo race on the same row. The compare-and-set makes one of
  them the winner. Signal: two audit rows or two emails for one refund.
- Fee idempotency keys that collide with the booking namespace. Signal: Stripe returns an
  idempotency mismatch error in the fee top-up.
- The webhook's tour path must stay byte-for-byte in behaviour. Signal: any existing
  `route.test.ts` refund case changes.
