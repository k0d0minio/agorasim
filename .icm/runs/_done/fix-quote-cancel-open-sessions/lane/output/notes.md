# Bug: fix-quote-cancel-open-sessions

- observed: `cancelQuoteAndOpenInstalments` marks written-off instalments `cancelled` in the
  database but leaves any Stripe Checkout session on them open, so a couple with the T−14 balance
  page still loaded can pay a cancelled event; `recordQuotePayment` only alerts a human once that
  has already happened · expected: cancelling an event closes every open Checkout session on its
  written-off instalments so the couple's page has nothing left to pay
- cause: `web/src/lib/quotes.ts`'s `cancelQuoteAndOpenInstalments` writes the row off but never
  calls Stripe; nothing downstream expired the session it may still hold
- fix: `web/src/lib/quote-checkout.ts`: exported the existing `expireSession` helper. `web/src/lib/quote-refund.ts`:
  `cancelEvent` (used by both the refund dialog's "Cancelar também o evento" and `cancelHeldQuote`)
  now expires each written-off instalment's `stripeSessionId` at Stripe on the owning account,
  best-effort — a Stripe failure is logged and does not undo the cancellation already recorded
- changelog: not user-visible (a couple could only ever hit the alert path, never actually pay;
  this closes the window, nothing in the UI changes)
- learned: none
