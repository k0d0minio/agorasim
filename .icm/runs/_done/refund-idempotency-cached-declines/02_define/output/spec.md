# Spec: A retried refund reaches Stripe instead of replaying its cached decline

- slug: refund-idempotency-cached-declines
- personas: team, operator
- touches: web/src/lib/quote-refund.ts, web/src/lib/quote-refund.test.ts, web/src/lib/booking-refund.ts, web/src/lib/form-schemas.ts, web/src/app/admin/sales/actions.ts, web/src/components/admin/quote-refund-dialogs.tsx
- complexity: standard

## Problem

Contracted feature ⑥ hardening — money already collected on a quote settles correctly under
retries, races and stale reads. Both refund paths key `refunds.create` on the row's state: the
quote card's "Reembolsar" on `quote-refund:<payment>:<refunded so far>:<amount>`
(`web/src/lib/quote-refund.ts`), the tour cancel on
`booking-refund:<booking>:<refunded so far>:<amount>` (`web/src/lib/booking-refund.ts`). Stripe
stores the result of a request against its key for 24 hours — a decline such as
`balance_insufficient` included. On the quote path a refused refund writes nothing, so the
operator's advised "Tente de novo daqui a pouco" sends the same key and gets the same cached
decline back for a day; and a refund that Stripe first accepted and later marked `failed` is
handed back, as its original response, to a re-issue of the same amount — which then reports a
refund that never happened. The key also fails at its own job: two submissions of the same
partial refund that arrive one after the other (the first already recorded) carry different
"refunded so far" values and become two real refunds.

On the tour path the bug is unreachable today — the claim (`confirmed → cancelled`) lets exactly
one call reach Stripe per booking, and a declined tour refund is issued by hand in the Stripe
dashboard — but the key still describes the row rather than the attempt.

## Proposed change

**The idempotency key names the attempt, not the row's state** (settled in Define,
2026-10-01).

**1. Quote path — a per-attempt id carried by the form.** The "Reembolsar" dialog
(`quote-refund-dialogs.tsx`) posts a hidden `attemptId`: a fresh UUID generated in the browser
when the dialog opens and regenerated every time the action returns a result, whatever the
outcome. A double click, or a second submit while the first is pending, posts the same id; a
deliberate retry after any answer posts a new one.

- `refundQuotePaymentSchema` (`form-schemas.ts`) requires `attemptId` as a UUID. A post without
  a valid one — a tab left open across the deploy — fails validation with
  **"Recarregue a página e tente de novo."** and nothing reaches Stripe (D-2).
- `refundLeadQuotePayment` (`actions.ts`) passes it to `refundQuotePayment`, which passes it to
  the Stripe call. The key becomes `quote-refund:<paymentId>:<attemptId>`; the amount and the
  "refunded so far" leave the key (Stripe already rejects a reused key with different
  parameters, and an attempt id is never reused with a different amount by the dialog).
- A replayed attempt whose first submission succeeded gets Stripe's cached refund back (same
  id). The settle that follows already finds the row equal to the charge and changes no amount,
  audits nothing and notifies nobody; the action reports the refund as sent. No new code beyond proving it.
- A replayed attempt whose first submission was declined gets the cached decline — both
  submissions report `refund-failed`, which is the truth for that attempt.
- A refund returned `failed` or `canceled` is reported as `refund-failed` exactly as today; the
  operator's retry carries a new attempt id, so it can never be handed that refund again.
- The `refund-failed` message the operator reads is unchanged — "Tente de novo daqui a pouco"
  is now correct advice.

**2. Tour path — keyed on the claim (D-1).** `issueRefund` (`booking-refund.ts`) keys the refund on
`booking-refund:<bookingId>:<claim timestamp>` — the claimed row's `cancelledAt` in epoch
milliseconds, written by the same claim that lets exactly one caller through. No form change on
the Sales board's "Cancelar" or the guest's cancel link: the claim is the attempt. A double
submit still collapses on the claim (the second caller gets `not-cancellable` and never reaches
Stripe); any future path that claims a booking again gets a fresh key by construction.

**3. The comments follow.** The module and function notes that justify the old keys
(`booking-refund.ts` module note and `issueRefund`, `quote-refund.ts` `issueInstalmentRefund`,
the `refunded-unrecorded` comment in `actions.ts` that mentions "the idempotency key") are
rewritten to say what the key is now and why.

**Tests.** `quote-refund.test.ts` gains the quote-path cases below; the tour path gets its first
unit test file, `web/src/lib/booking-refund.test.ts`, in the same mocking style.

## Acceptance criteria

- [ ] The quote refund dialog posts an `attemptId` that stays the same across a double submit and changes after every result the action returns
- [ ] A quote refund post without a valid `attemptId` is refused with "Recarregue a página e tente de novo." and makes no Stripe call
- [ ] The quote refund's Stripe call carries the key `quote-refund:<paymentId>:<attemptId>`, independent of the amount and of what was refunded before (test)
- [ ] Two submissions of the same partial quote refund with the same `attemptId`, one after the other, send the same key to Stripe and leave one refund recorded — one audit row, one couple's notice (test)
- [ ] After a declined quote refund, a retry with a new `attemptId` reaches Stripe with a different key and, when Stripe accepts it, is recorded as refunded (test)
- [ ] A quote refund Stripe returns `failed` or `canceled` is still reported as `refund-failed` with nothing written (test)
- [ ] The tour refund's Stripe call carries the key `booking-refund:<bookingId>:<cancelledAt in ms>` from the claimed row (test)
- [ ] A second `cancelAndRefundBooking` on the same booking returns `not-cancellable` and makes no Stripe call (test)
- [ ] CI green

## Out of scope

- Deduplicating the two paths' Stripe plumbing — stub 5 of this epic (`refund-paths-dedupe`);
  this run changes only what each key is derived from.
- An in-app retry for a declined tour refund — it stays "Emita-o no painel do Stripe".
- The application-fee top-up keys (`booking-fee-refund:` / `quote-fee-refund:`) — keyed on the
  fee target, they are redelivery-safe and not affected by a declined couple's refund.
- Disabling the dialog's submit button while pending, or any other change to the dialog's UI.

## Open questions

- none
