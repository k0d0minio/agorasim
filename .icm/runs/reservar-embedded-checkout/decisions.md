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
- D-9 — Links into `/reservar` (`BookingButton`, the header and mobile nav item) are full page loads, and the booking form reloads once if its document was not loaded on the booking route. A CSP belongs to the document: a client-side `<Link>` into `/reservar` would keep the previous page's policy, which refuses Stripe. Build — a spec gap (the spec did not name the navigation side), recorded in notes.md.
- D-10 — The publishable key gates `/reservar` only (`isEmbeddedCheckoutConfigured` + `publishableKeyMismatch`), not `isStripeConfigured`/`keyModeMismatch`: those also gate the webhook, refunds and the quote page, which need only the secret key. Build — narrows the spec's "keyModeMismatch extends to it" to the AC's own scope (`/reservar` turns to the enquiry form); recorded in notes.md.
- D-11 — `@stripe/stripe-js@^9.17.0`, not 10.x: 10.0.0 (released 2026-10-01) loads Stripe's `endive` release while the server SDK and `API_VERSION` are `dahlia`; 9.17 is the `dahlia` line. Build.
