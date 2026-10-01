# Plan: refund-idempotency-cached-declines

Build's execution plan in passes — each pass one layer of the change, in the order it lands, so
a session that resumes mid-build sees where it is. Written by the advisor pass (Define, or
Build's first act on `sonnet` after reading the spec), executed pass by pass, and rewritten when
reality disagrees with it — never left describing a plan that was abandoned.

## Passes

1. **The quote form carries the attempt** — `web/src/lib/form-schemas.ts`
   (`refundQuotePaymentSchema.attemptId: z.uuid(...)` with "Recarregue a página e tente de
   novo."), `web/src/components/admin/quote-refund-dialogs.tsx` (an `attemptId` state from
   `crypto.randomUUID()`, set on open and regenerated in an effect keyed on `state`; a hidden
   `<input name="attemptId">`) — done when: the dialog posts the id and a post without one is
   refused before `refundQuotePayment` runs.
2. **The quote refund keys on it** — `web/src/app/admin/sales/actions.ts` (pass `attemptId`
   through; rewrite the `refunded-unrecorded` comment's idempotency-key clause),
   `web/src/lib/quote-refund.ts` (`refundQuotePayment` and `issueInstalmentRefund` take
   `attemptId`; key `quote-refund:${payment.id}:${attemptId}`; `issueInstalmentRefund`'s note
   rewritten) — done when: typecheck is clean and every existing `refundQuotePayment` test call
   passes an `attemptId`.
3. **The tour refund keys on the claim** — `web/src/lib/booking-refund.ts` (`issueRefund` keys
   `booking-refund:${booking.id}:${booking.cancelledAt!.getTime()}` from the claimed row; the
   module note's double-submit paragraph and the key comment rewritten) — done when: no caller
   changes and the key reads only the claimed row.
4. **Tests** — `web/src/lib/quote-refund.test.ts` (the key shape; same-attempt replay after a
   recorded partial refund → one audit row, one notice; declined then new attempt → new key,
   recorded; `failed`/`canceled` still `refund-failed`), new `web/src/lib/booking-refund.test.ts`
   in `quote-refund.test.ts`'s mocking style (the claim-keyed key; a second call →
   `not-cancellable`, no Stripe call) — done when: each acceptance criterion marked (test) has
   one.
5. **CI** — push, `ci-status.sh` → GREEN; flip ready per Build.

## Risks

- The replay case relies on the Stripe mock returning the same refund for the same key — the
  test's mock must model that (a map keyed on the idempotency key), or the "one audit row"
  assertion proves nothing.
- `booking-refund.ts` has no unit test today; mocking `db`, `onOwningAccount` and the email
  sender may take more than the quote file's harness gives for free. The signal is a test file
  that mocks the function under test — keep the real `cancelAndRefundBooking`.
- `cancelledAt` is nullable in the type; the claim always sets it. Read it from the claimed row,
  never `new Date()`, or two racing callers could still each mint a key (they cannot both claim,
  but the key must come from the row that won).
- Stub 5 (`refund-paths-dedupe`) extracts the shared skeleton after this; keep the key a plain
  argument to the Stripe call so the extraction can take it as a parameter.
