# Build notes: reservar-embedded-checkout

- commits: b2b6aa0 (policy + key switch) · b7a57ee (embedded session + release) · 9e37290 (payment step + links) · 055b3de (privacy + processor record)
- ci: pending — read at the flip
- ready: (written after the flip)

## What changed

- `web/src/lib/security-headers.ts`: `PAYMENT_CSP` = `PUBLIC_DIRECTIVES` plus Stripe's published embedded-Checkout origins (Stripe.js list + Checkout list, docs.stripe.com/security/guide, read 2026-10-02); `frame-src 'none'` is replaced, not extended. `PAYMENT_PERMISSIONS_POLICY` delegates `payment` to self, `js.stripe.com` and `checkout.stripe.com`. `PAYMENT_ROUTE_SOURCES` names the paths.
- `web/next.config.ts`: the payment CSP and Permissions-Policy are listed last for `/:locale(pt|en)/reservar` and below, so they are the values sent there (Next's "last match wins"); nothing else changes.
- `web/src/lib/stripe.ts`: `publishableKeyMismatch` (missing, not a `pk_`, mode differs from the secret key, live on preview, test on production), `isEmbeddedCheckoutConfigured`, `publishableKey`. Mismatch alerts are now de-duplicated per reason, so a publishable-key alert is not silenced by an earlier secret-key one.
- `web/src/lib/booking-checkout.ts`: `ui_mode: "embedded_page"` (this API version's name), `redirect_on_completion: "always"`, `return_url` to `/{locale}/reservar/confirmacao?session_id=…`; no `success_url`/`cancel_url`; returns the client secret. New `releaseBookingCheckout`: parses the session id from the client secret, requires a `pending` booking on it, retrieves the session on its owning account, compares the secret in constant time, requires `status: open`, expires it and closes the booking (`closeUnpaidBooking`, the same guarded close the webhook runs).
- `web/src/app/[locale]/reservar/checkout-actions.ts`: `startCheckout` returns `{ payment: { clientSecret, publishableKey, stripeAccount } }` instead of `redirect()`; gated on `isEmbeddedCheckoutConfigured`. New `releaseCheckout` action, throttled on its own key, best-effort and silent.
- `web/src/app/[locale]/reservar/page.tsx`: `canCheckout` asks `isEmbeddedCheckoutConfigured`.
- `web/src/components/embedded-checkout.tsx` (new, reusable by `quote-embedded-checkout`): loads Stripe.js through `@stripe/stripe-js/pure` on mount only, mounts `createEmbeddedCheckoutPage`, serialises instances, shows a loading line and a failure block.
- `web/src/components/booking-checkout-form.tsx`: on a successful submit the form is replaced by the payment step — summary card (tour, day, departure, lines, people, total, hold note) above on a phone and beside on desktop, the embedded form, "back". Back keeps the basket held in the component's state (so the form reappears as left, the uncontrolled opt-in box remounts unticked) and calls `releaseCheckout`. One-time reload backstop when the document was not loaded on the booking route.
- `web/src/components/booking-button.tsx`, `site-header.tsx`, `mobile-nav.tsx`: links into `/reservar` are plain `<a>` (full loads) — D-9.
- `web/src/content/booking.ts`: payment-step copy, PT and EN.
- `web/src/lib/checkout-draft.ts`: comment only — the draft path stays for hosted sessions opened before the switch.
- `web/src/content/privacy.ts`, `.icm/docs/data-protection.md`: the embedded form on the booking page, Stripe's fraud-prevention cookies there, quote instalments still redirect. `lastUpdated` → 2 October 2026. `MARKETING_CONSENT_VERSION` untouched (the opt-in wording did not change).
- `web/.env.example`: `STRIPE_PUBLISHABLE_KEY`, targets `[production,preview]`.
- `web/package.json`, `pnpm-lock.yaml`: `@stripe/stripe-js@^9.17.0` (D-11).

## Acceptance criteria status

- [ ] Pay and book never navigates to stripe.com; the form appears in place — implemented (no `redirect`, embedded mount, full-load links + reload backstop); proven only on the preview smoke.
- [ ] Summary (tour, date, slot, party, add-ons, total) PT/EN, above at 375px, beside on desktop — implemented (`PaymentStep`); visual, preview smoke.
- [ ] Back shows the form as entered, opt-in unticked — implemented (basket in component state; uncontrolled checkbox remounts); preview smoke.
- [x] Back expires the session at once; booking `pending` → `expired`; car free — `releaseBookingCheckout` + tests.
- [ ] Test payment ends on `/{locale}/reservar/confirmacao?session_id=…`, Booked, both emails — `return_url` asserted in tests; the webhook/confirmation path is unchanged; end to end on the preview smoke.
- [x] Connect fee as today, none without Connect — test.
- [x] `expires_at` equals the hold's lapse — test.
- [x] Stripe.js requested only after Pay — `@stripe/stripe-js/pure`, loaded in `EmbeddedCheckout`'s mount effect only; the reload backstop loads nothing.
- [x] `/reservar` serves `PUBLIC_CSP` + Stripe only, Permissions-Policy `payment` self + Stripe; other routes unchanged — tests on the values; `next.config.ts` scopes them.
- [x] Publishable key not in prerendered HTML — runtime, server-only variable, returned by the action; `page.test.ts` asserts it is absent from the page tree.
- [x] Mismatched or missing publishable key → enquiry form, reported once — `stripe.test.ts`, `page.test.ts`, `checkout-actions.test.ts`.
- [ ] Embedded form fails to load → localized message with a way back, never a redirect — implemented (`EmbeddedCheckout` failure block); preview smoke (block `js.stripe.com` in devtools).
- [x] Privacy policy (PT/EN) and the Stripe row describe the embedded form — done.
- [x] Unit tests cover the four named cases — `checkout-actions.test.ts`, `booking-checkout.test.ts`, `stripe.test.ts`, `security-headers.test.ts`.

## Notes for Release

- **Spec gaps decided here (D-9, D-10, D-11, `decisions.md`).** D-9: a CSP belongs to the document, so a client-side `<Link>` into `/reservar` would keep the previous page's policy and Stripe's form would never load; links into `/reservar` are now full loads, with a reload backstop in the form. D-10: the spec said `keyModeMismatch` "extends to" the publishable key; doing that literally would switch off the webhook, refunds and quote payments when only the browser key is missing, so the publishable key gates `/reservar` alone — which is what the criterion itself names. D-11: `@stripe/stripe-js` pinned to the `dahlia` line.
- **Env (stop class 3):** `STRIPE_PUBLISHABLE_KEY` is missing on Vercel for Preview, the `uat` environment and Production — the operator's act; until set, `/reservar` shows the enquiry form by design. `env.sh audit --changed` also lists `STRIPE_SECRET_KEY` and `STRIPE_CONNECTED_ACCOUNT_ID` as "missing development" — those declarations predate this branch (no targets suffix, so the audit assumes all three) and sit beside the new block; not this run's keys.
- Review closely: `releaseBookingCheckout` (secret comparison, `pending` + `open` guards), the payment CSP origins, and `next.config.ts` ordering.
- The confirmation page is under `/reservar/confirmacao`, so it also carries the payment policy — intended (the spec's "and below").
- Context budget: read `site-header.tsx`, `mobile-nav.tsx`, `booking-button.tsx`, `content/privacy.ts`, `reservar/page.test.ts` beyond `touches:` — D-9 and the page test's checkout case needed them.
