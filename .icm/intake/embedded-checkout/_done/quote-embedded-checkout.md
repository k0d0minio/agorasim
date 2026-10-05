# Stub: Pay a quote instalment without leaving the quote page

- feature-slug: quote-embedded-checkout
- scope: embedded-checkout
- personas: guest
- initiative: online booking / objective: a guest books and pays without ever leaving the site
- depends-on: reservar-embedded-checkout
- sequence: 2 of 2
- complexity: medium
- priority: P2
- recommended-model: sonnet

## Problem

The pay button on a quote page (`/orcamento/<token>`) sends the couple or event client to
checkout.stripe.com for the deposit or balance, the same break in trust as the tour booking.

## Proposed change

The quote's deposit or balance is paid in Stripe's payment form shown inside the quote page,
reusing the embedded-payment piece built in stub 1. After paying, the quote page shows the
instalment as paid, as it does today.

## Acceptance criteria (rough)

- [ ] Paying a deposit or a balance never navigates to a stripe.com address.
- [ ] A successful test payment marks the instalment paid on the quote page and in admin, as today.
- [ ] The Connect fee is still taken; the session's expiry and the "another tap won" handling in `lib/quote-checkout.ts` still hold.
- [ ] Works in PT and EN, and at phone width.

## Out of scope (this feature)

- Refunds and admin quote tools.
- The UAT payment error (D-4).

## Notes for Define

- D-1, D-2. Reuse stub 1's embedded component and security policy; this stub adds no new third party.
- Open: where on the quote page the payment step appears (in place of the pay button, or replacing the payment section), and where the guest lands after paying (today `success_url` back to the same page with `session_id`).
- The token rides in today's `success_url` / `cancel_url`; keep it out of any new URL beyond what Stripe already holds.
- touches: web/src/lib/quote-checkout.ts, web/src/components/quote-pay-form.tsx, web/src/app/[locale]/orcamento/**
