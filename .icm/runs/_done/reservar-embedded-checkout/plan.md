# Plan: reservar-embedded-checkout

Build's execution plan in passes — each pass one layer of the change, in the order it lands, so
a session that resumes mid-build sees where it is. Written by the advisor pass (Define, or
Build's first act on `sonnet` after reading the spec), executed pass by pass, and rewritten when
reality disagrees with it — never left describing a plan that was abandoned.

## Passes

All four landed as planned; what reality changed is folded in below.

1. **Keys and headers** — `stripe.ts` (`publishableKeyMismatch`, `isEmbeddedCheckoutConfigured`, `publishableKey` — a separate switch, D-10), `security-headers.ts` (`PAYMENT_CSP` derived from `PUBLIC_DIRECTIVES`, `PAYMENT_PERMISSIONS_POLICY`, `PAYMENT_ROUTE_SOURCES`), `next.config.ts` (payment entries last — Next sends the last match), `payment-route.ts` — done: tests assert the payment policy is the public one plus Stripe's list only. ✓ b2b6aa0
2. **Server** — `booking-checkout.ts` (`ui_mode: "embedded_page"` — this API version's name, not `embedded`; `redirect_on_completion: "always"`, `return_url`; `releaseBookingCheckout` checks the client secret against Stripe's session, `pending` + `open` only, closes the booking itself as well as via the webhook), `checkout-actions.ts` (`startCheckout` returns `{ payment }`; `releaseCheckout`) — done: tests. ✓ b7a57ee
3. **Client** — `embedded-checkout.tsx` (`@stripe/stripe-js/pure`, `createEmbeddedCheckoutPage`, one instance at a time), `booking-checkout-form.tsx` (payment step; back keeps the in-memory basket rather than restoring the draft), full-load links + reload backstop (D-9), PT/EN copy — done: the preview smoke. ✓ 9e37290
4. **Privacy and records** — `privacy.ts`, `data-protection.md`. ✓ 055b3de

## Risks

- Stripe's CSP list moves: it was read from docs.stripe.com/security/guide on 2026-10-02. A blank payment frame on the preview with a CSP violation in the console means an origin is missing.
- Apple Pay will not show until the operator registers the domains in Stripe; expected.
- A guest who reloads the page on the payment step loses the step (the hold lapses at 30 min); not covered by the spec.
