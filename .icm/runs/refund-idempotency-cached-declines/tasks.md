# Tasks: refund-idempotency-cached-declines

The queue, with a definition of done per item. Ticked by the stage that finishes the item —
a human checkbox, never a script's. The definition of done is seeded from the spec's
acceptance criteria when the run is opened; the queue is Build's own, one line per commit-sized
step, so a resuming session can pick up the first unticked line.

## Definition of done

- [x] The quote refund dialog posts an `attemptId` that stays the same across a double submit and changes after every result the action returns
- [x] A quote refund post without a valid `attemptId` is refused with "Recarregue a página e tente de novo." and makes no Stripe call
- [x] The quote refund's Stripe call carries the key `quote-refund:<paymentId>:<attemptId>`, independent of the amount and of what was refunded before (test)
- [x] Two submissions of the same partial quote refund with the same `attemptId`, one after the other, send the same key to Stripe and leave one refund recorded — one audit row, one couple's notice (test)
- [x] After a declined quote refund, a retry with a new `attemptId` reaches Stripe with a different key and, when Stripe accepts it, is recorded as refunded (test)
- [x] A quote refund Stripe returns `failed` or `canceled` is still reported as `refund-failed` with nothing written (test)
- [x] The tour refund's Stripe call carries the key `booking-refund:<bookingId>:<cancelledAt in ms>` from the claimed row (test)
- [x] A second `cancelAndRefundBooking` on the same booking returns `not-cancellable` and makes no Stripe call (test)
- [x] CI green

## Queue

- [x] Form carries the attempt — `form-schemas.ts`, `quote-refund-dialogs.tsx` (3d8a0ff)
- [x] Quote refund keyed on it — `actions.ts`, `quote-refund.ts` (3d8a0ff)
- [x] Tour refund keyed on the claim — `booking-refund.ts` (3d8a0ff)
- [x] Tests — `quote-refund.test.ts`, new `booking-refund.test.ts`, `form-schemas.test.ts` (3d8a0ff)
- [x] Admin actions suite's claim fixtures carry `cancelledAt` (30aa426)
- [x] CI GREEN on the ready head (30aa426)
