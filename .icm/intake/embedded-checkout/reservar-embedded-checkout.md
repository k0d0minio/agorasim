# Stub: Pay for a tour without leaving /reservar

- feature-slug: reservar-embedded-checkout
- scope: embedded-checkout
- personas: guest
- initiative: online booking / objective: a guest books and pays without ever leaving the site
- depends-on: none
- sequence: 1 of 2
- complexity: medium
- priority: P1
- recommended-model: sonnet

## Problem

"Pay and book" sends the guest to checkout.stripe.com. They leave agorasim at the moment they
are handing over money, which is the moment trust matters most.

## Proposed change

After "Pay and book", the booking form on `/reservar` is replaced by Stripe's payment form shown
inside the page. The summary of the tour, date, party and price stays in view, and the guest
can go back to change their details. After paying, the guest gets the same confirmation as
today. The hold, commission, webhook and emails do not change.

## Acceptance criteria (rough)

- [ ] Clicking "Pay and book" never navigates to a stripe.com address; the payment form appears inside `/reservar`.
- [ ] The summary (tour, date, slot, party, total) stays visible next to or above the payment form, in PT and EN.
- [ ] The guest can go back from the payment step and finds their details still filled in.
- [ ] A successful test payment ends on the booking confirmation, the booking reaches "Booked" on the Sales board, and both emails go out, exactly as today.
- [ ] The Connect application fee is still taken on the payment.
- [ ] The car hold still lapses at the same moment the payment session expires.
- [ ] The payment step works at phone width.
- [ ] The public security policy admits only what Stripe's embedded form needs, and nothing else changes on other pages.

## Out of scope (this feature)

- Quote payments (stub 2).
- The UAT payment error (bug lane, D-4).
- A custom card form (D-1).

## Notes for Define

- D-1: embedded Stripe Checkout, not the Payment Element. D-3: replace the form in place, summary kept, a way back.
- Open: where the guest lands after paying — `/reservar/confirmacao` as now, or the result in place. Today it is reached by Stripe's `success_url` with `session_id`.
- Open: how "go back" works. Today `cancel_url` returns with a flag and the form restores from the browser draft (`lib/checkout-draft.ts`). Embedded Checkout has no cancel URL. Decide what happens to the booking row and its car hold when the guest goes back (cancel it at once, or let it lapse).
- Open: the security policy. `PUBLIC_CSP` in `web/src/lib/security-headers.ts` sets `frame-src 'none'`, `connect-src 'self'` and no third-party scripts, and `Permissions-Policy` sets `payment=()`, which blocks Apple Pay / Google Pay inside the frame. Set the narrowest change Stripe documents for embedded Checkout. Public pages are ISR, so no per-request nonce.
- The publishable key reaches the browser for the first time; decide how it is exposed and that its mode is checked against the deployment like the secret key is (`keyModeMismatch` in `web/src/lib/stripe.ts`).
- touches: web/src/lib/security-headers.ts, web/src/lib/booking-checkout.ts, web/src/app/[locale]/reservar/** , web/src/components/ (a shared embedded-payment component), web/package.json (Stripe's browser library)
