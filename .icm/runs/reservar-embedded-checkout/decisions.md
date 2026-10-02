# Decisions: reservar-embedded-checkout

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

- D-5 — After paying, the guest lands on `/{locale}/reservar/confirmacao?session_id=…` as today (Stripe's `return_url`), not a result in place. Keeps the confirmation page and its webhook-race fallback unchanged. Define, operator's answer.
- D-6 — "Back" from the payment step expires the Stripe session at once; the expired webhook closes the booking and frees the car. A guest's abandoned hold no longer blocks their own re-submit. Define, operator's answer.
- D-7 — The payment CSP and `Permissions-Policy: payment` apply only to `/:locale/reservar` and below (stub 2 adds the quote route), derived from `PUBLIC_CSP`. Define.
- D-8 — The publishable key is a runtime, server-only `STRIPE_PUBLISHABLE_KEY` returned by the checkout action and mode-checked like the secret key; missing = payments off. Define.
