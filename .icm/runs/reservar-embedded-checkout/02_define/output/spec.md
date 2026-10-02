# Spec: Pay for a tour without leaving /reservar

- slug: reservar-embedded-checkout
- personas: guest
- touches: web/src/lib/security-headers.ts, web/next.config.ts, web/src/lib/stripe.ts, web/src/lib/booking-checkout.ts, web/src/app/[locale]/reservar/checkout-actions.ts, web/src/app/[locale]/reservar/page.tsx, web/src/components/booking-checkout-form.tsx, web/src/components/embedded-checkout.tsx, web/src/lib/checkout-draft.ts, web/src/content/, web/src/content/privacy.ts, .icm/docs/data-protection.md, web/package.json
- complexity: standard

## Problem

"Pay and book" on `/reservar` sends the guest to checkout.stripe.com and back. They leave
agorasim at the moment they hand over money, which is when trust matters most. This advances the
online-booking objective — a guest books and pays without ever leaving the site — and is stub 1
of the `embedded-checkout` scope (D-1, D-3); stub 2 (`quote-embedded-checkout`) reuses what this
one builds.

## Proposed change

Keep Stripe Checkout and show it inside our page (Stripe's embedded Checkout, D-1). Everything
behind the payment is unchanged: the booking row and its car hold, the price computed on the
server, the Connect application fee, the session expiry equal to the hold's lapse, the webhook,
the Sales board, the emails.

**The payment step (D-3).** "Pay and book" still runs the server action with today's checks
(honeypot, per-IP throttle, catalogue pricing, live availability re-check). On success it no
longer redirects; it returns what the browser needs to mount the embedded form — the session's
client secret and the publishable key — and the booking form on `/reservar` is replaced in place
by the payment step. The step shows the summary (tour, date, slot, party, add-ons, total) above
the form on phone width and beside it on wide screens, and a "back" control. Stripe's browser
script is loaded only when the payment step mounts, never on page load and never on any other
page.

**After paying (settled in Define).** The guest lands on `/reservar/confirmacao?session_id=…`
exactly as today — Stripe's in-frame completion navigates the top window to that agorasim URL
(the session's `return_url`, replacing `success_url`). The confirmation page and its
webhook-race fallback (`confirmPaidBooking`) are unchanged.

**Going back (settled in Define).** "Back" returns to the booking form with every field the guest
had filled in (the existing browser draft in `lib/checkout-draft.ts`, minus the marketing
opt-in, as today) and **releases the car at once**: the server expires the Stripe session, the
existing `checkout.session.expired` webhook closes the booking row as `expired` through
`closeUnpaidBooking`, and the car returns to the pool. The expire call names the session by the
booking it belongs to and only acts on a `pending` booking; a guest can expire only the session
they were just handed. If the expire call fails, the guest still goes back to the form, and the
hold lapses at its normal expiry. The `cancel_url` return path is retired for bookings (embedded
Checkout has none); the draft-restore code path it fed is reused by "back".

**Security policy, narrowest that works.** Today `PUBLIC_CSP` has `frame-src 'none'`,
`connect-src 'self'`, no third-party script, and `Permissions-Policy` sets `payment=()`. Only on
the booking route (`/:locale/reservar` and below), a payment variant of the public policy is
served: `PUBLIC_CSP` plus exactly the origins Stripe documents for embedded Checkout (script
`https://js.stripe.com`; frames and connections to Stripe's checkout and js hosts; Stripe's image
host if the docs require it), derived from `PUBLIC_CSP` in `security-headers.ts` so the two never
drift. On the same route, `Permissions-Policy` delegates `payment` to self and Stripe's frame
origin so Apple Pay / Google Pay can run inside the frame. Every other public page, and the admin
policy, are byte-for-byte unchanged. The route stays ISR — no nonce (AGENTS.md § Conventions).
Stub 2 adds the quote route to the same variant; this stub does not.

**Publishable key.** Read at runtime from a server-only `STRIPE_PUBLISHABLE_KEY` and handed to
the browser in the action's response — not a `NEXT_PUBLIC_` variable, so it is never baked into
the prerendered HTML and is always the deployment's own. `keyModeMismatch` extends to it: a
`pk_live_` on a preview, a `pk_test_` on production, or a publishable key whose mode differs from
the secret key's, is a mismatch and turns payments off through the existing payments-off path
(the enquiry form). A missing publishable key with a secret key set is also payments-off,
reported once like a mismatch.

**Privacy.** The privacy policy (PT and EN, `content/privacy.ts`) today says no external system
is embedded in our pages and that paying redirects to checkout.stripe.com. Both become untrue.
The "Cookies and third-party services" paragraph is rewritten to say the payment form on the
booking page is Stripe's, shown inside our page, loaded only at the payment step, and that Stripe
may set its own fraud-prevention cookies there under its own policy. The Stripe row in
`.icm/docs/data-protection.md` changes from "Checkout (redirect)" to "Checkout (embedded on
`/reservar`; redirect on the quote page until stub 2)". Same PR, per the data-protection rule.

**Errors.** If the embedded form fails to load (script blocked, network), the step shows a
localized message with the "back" control and the enquiry contacts; it never falls back to a
redirect to stripe.com.

## Acceptance criteria

- [ ] Clicking "Pay and book" with valid details never navigates to a stripe.com address; Stripe's payment form appears inside `/reservar` in place of the booking form.
- [ ] The payment step shows the tour, date, slot, party, add-ons and total, in PT on `/pt/reservar` and EN on `/en/reservar`, above the form at 375px wide and beside it on desktop.
- [ ] Pressing "back" on the payment step shows the booking form with tour, mode, party, add-ons, date, slot, name, email, phone and message as entered, and the marketing opt-in unticked.
- [ ] Pressing "back" expires the Stripe session at once; the booking row moves from `pending` to `expired` and the car is bookable again for that date and slot without waiting 30 minutes.
- [ ] A successful test payment ends on `/{locale}/reservar/confirmacao?session_id=…` on agorasim, the booking reaches "Booked" on the Sales board, and the guest and team emails go out, as today.
- [ ] The payment carries the Connect application fee exactly as today when `STRIPE_CONNECTED_ACCOUNT_ID` is set, and none when it is unset.
- [ ] The Stripe session's `expires_at` still equals the booking hold's lapse.
- [ ] Stripe's browser script is requested only after "Pay and book" succeeds; it is not requested on `/reservar` page load or on any other page.
- [ ] `/reservar` (both locales, and below) serves a CSP that is `PUBLIC_CSP` plus only Stripe's documented embedded-Checkout origins, and a `Permissions-Policy` whose `payment` admits self and Stripe only; every other public route and every `/admin` route serves exactly the headers it serves today.
- [ ] The publishable key is not in any prerendered HTML or JS bundle; it reaches the browser only in the checkout action's response.
- [ ] A publishable key whose mode contradicts the deployment or the secret key, or a missing publishable key, turns `/reservar` to the enquiry form and is reported once, as a secret-key mismatch is today.
- [ ] If the embedded form fails to load, the guest sees a localized message with a way back to the form, and is never redirected to stripe.com.
- [ ] The privacy policy (PT and EN) and the Stripe row in `.icm/docs/data-protection.md` describe the embedded form, and no longer claim nothing external is embedded.
- [ ] Unit tests cover: the action returns a client secret instead of redirecting; the back/expire path only expires a pending booking's own session; the extended key-mode check; the payment-route headers differ from `PUBLIC_CSP` only by the Stripe additions.

## Out of scope

- Quote payments on `/orcamento/<token>` — stub 2 (`quote-embedded-checkout`), which reuses the embedded component and adds its route to the payment policy.
- The UAT "There was an error processing your request." payment error — a separate bug lane (D-4).
- A custom card form (Stripe's Payment Element) (D-1).
- Which payment methods are offered, and Stripe Checkout branding — Stripe dashboard settings.
- Registering agorasim's domains with Stripe for Apple Pay (dashboard → Payment method domains) — an operator act; until done, Apple Pay simply does not show in the frame.
- Admin payments, refunds, the Sales board, the emails, the webhook's confirm path.

## Open questions

- none
