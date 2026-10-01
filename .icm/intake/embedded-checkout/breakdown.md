# Breakdown: Embedded checkout — the guest pays without leaving agorasim

- scope-slug: embedded-checkout · story: runs/embedded-checkout/01_scope/\_source/story.md
- initiative: online booking / objective: a guest books and pays without ever leaving the site
- personas: guest

## What I understood

Today, "Pay and book" on `/reservar` and the pay button on a quote page both send the guest to
Stripe's own page, then back. Jamie wants the guest to stay on agorasim the whole time. We keep
Stripe Checkout, so the hold, the commission, the webhook and the emails stay as they are, but
show its payment form inside our page (D-1). On `/reservar` the payment step takes the booking
form's place, with the summary kept in view and a way back (D-3). Quote payments move the same
way (D-2). The UAT payment error Jamie hit is separate and goes to the bug lane (D-4).

## Where it sits

The guest's journey from choosing a date and party on `/reservar` to a paid booking, and a
quote's deposit or balance payment on `/orcamento/<token>`. Booking, Quote payment.

## Build order

1. reservar-embedded-checkout — the tour booking's payment shows inside `/reservar`; the site's security policy lets Stripe's form in — depends-on: none
2. quote-embedded-checkout — a quote instalment's payment shows inside the quote page — depends-on: reservar-embedded-checkout

## Parallelizable

None. Both stubs touch the security policy and the shared embedded-payment component, so they
are sequenced.

## Out of scope (whole scope)

- The UAT payment error — a separate bug lane run (D-4).
- A fully custom card form (Payment Element) (D-1).
- Which payment methods are offered, and Stripe dashboard branding — dashboard settings.
- Admin payments, refunds, the Sales board and the emails.
