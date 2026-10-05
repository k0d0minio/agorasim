# Decisions: quote-embedded-checkout

The `D-n` ids this run rests on, mirrored from the scope's Decisions table
(`_shared/scope-template.md` → `D-n` ids are permanent), plus any the run itself had to make.
`validate-decisions.sh <slug>` traces the scope's ids into `spec.md` and `notes.md`; this file
is the run's own ledger, so a session need not open the scope to know what was settled and a
decision made mid-run has one home.

## From the scope

- D-1 — Use Stripe's embedded Checkout: Stripe's own payment form, shown inside our page.
- D-2 — Both payments move: tour bookings on `/reservar` and quote instalments (deposit and balance) on the quote page.
- D-3 — On `/reservar`, the booking form is replaced in place by the payment step, on the same page. The summary of what they are buying stays in view, with a way back to change their details.
- D-4 — The UAT payment error is handled on its own, as a bug, not in this scope.

## Made in this run

- D-12 — The quote payment step replaces the pay-button block in place (button, conditions notice, secure line), under a line naming the instalment and amount; the quote, payments and terms above are untouched. Define, operator's answer.
- D-13 — "Back" on the quote payment step returns to the pay button with no server call; the open session is reused on the next tap. A quote holds no car, so nothing is released. Define, operator's answer.
- D-14 — After paying, Stripe navigates the tab to the quote page with `?session_id=` (the session's `return_url`, today's `success_url`), where `reconcileQuoteReturn` runs as today. No result-in-place, no new URL carrying the token. Define, operator's answer.
- D-15 — A missing or mode-mismatched publishable key makes a quote pay tap answer the existing "unavailable" refusal and report once (`isEmbeddedCheckoutConfigured`); never a fallback to the hosted redirect. Define, operator's answer.
- D-16 — An open hosted session minted before the switch is expired and replaced by an embedded one, like an older-terms session: it has no client secret and its URL is stripe.com. Define.
