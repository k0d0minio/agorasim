# Tasks: reservar-embedded-checkout

The queue, with a definition of done per item. Ticked by the stage that finishes the item —
a human checkbox, never a script's. The definition of done is seeded from the spec's
acceptance criteria when the run is opened; the queue is Build's own, one line per commit-sized
step, so a resuming session can pick up the first unticked line.

## Definition of done

- [ ] Clicking "Pay and book" with valid details never navigates to a stripe.com address; Stripe's payment form appears inside `/reservar` in place of the booking form.
- [ ] The payment step shows the tour, date, slot, party, add-ons and total, in PT on `/pt/reservar` and EN on `/en/reservar`, above the form at 375px wide and beside it on desktop.
- [ ] Pressing "back" on the payment step shows the booking form with tour, mode, party, add-ons, date, slot, name, email, phone and message as entered, and the marketing opt-in unticked.
- [x] Pressing "back" expires the Stripe session at once; the booking row moves from `pending` to `expired` and the car is bookable again for that date and slot without waiting 30 minutes.
- [ ] A successful test payment ends on `/{locale}/reservar/confirmacao?session_id=…` on agorasim, the booking reaches "Booked" on the Sales board, and the guest and team emails go out, as today.
- [x] The payment carries the Connect application fee exactly as today when `STRIPE_CONNECTED_ACCOUNT_ID` is set, and none when it is unset.
- [x] The Stripe session's `expires_at` still equals the booking hold's lapse.
- [x] Stripe's browser script is requested only after "Pay and book" succeeds; it is not requested on `/reservar` page load or on any other page.
- [x] `/reservar` (both locales, and below) serves a CSP that is `PUBLIC_CSP` plus only Stripe's documented embedded-Checkout origins, and a `Permissions-Policy` whose `payment` admits self and Stripe only; every other public route and every `/admin` route serves exactly the headers it serves today.
- [x] The publishable key is not in any prerendered HTML or JS bundle; it reaches the browser only in the checkout action's response.
- [x] A publishable key whose mode contradicts the deployment or the secret key, or a missing publishable key, turns `/reservar` to the enquiry form and is reported once, as a secret-key mismatch is today.
- [ ] If the embedded form fails to load, the guest sees a localized message with a way back to the form, and is never redirected to stripe.com.
- [x] The privacy policy (PT and EN) and the Stripe row in `.icm/docs/data-protection.md` describe the embedded form, and no longer claim nothing external is embedded.
- [x] Unit tests cover: the action returns a client secret instead of redirecting; the back/expire path only expires a pending booking's own session; the extended key-mode check; the payment-route headers differ from `PUBLIC_CSP` only by the Stripe additions.

## Queue

- [x] Pass 1 — payment CSP + Permissions-Policy on `/:locale/reservar` only (`security-headers.ts`, `next.config.ts`), `STRIPE_PUBLISHABLE_KEY` switch (`stripe.ts`), `payment-route.ts`, `@stripe/stripe-js@^9.17.0`, `.env.example` — b2b6aa0
- [x] Pass 2 — embedded session (`ui_mode: embedded_page`, `return_url`), `startCheckout` returns the client secret, `releaseCheckout` / `releaseBookingCheckout` — b7a57ee
- [x] Pass 3 — `EmbeddedCheckout` component, payment step in `BookingCheckoutForm`, full-load links into `/reservar` + reload backstop, PT/EN copy — 9e37290
- [x] Pass 4 — privacy policy (PT/EN) and the Stripe row in `data-protection.md` — 055b3de
