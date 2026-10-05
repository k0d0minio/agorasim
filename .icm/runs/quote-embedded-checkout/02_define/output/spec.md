# Spec: Pay a quote instalment without leaving the quote page

- slug: quote-embedded-checkout
- personas: guest
- touches: web/src/lib/quote-checkout.ts, web/src/lib/quote-checkout.test.ts, web/src/app/[locale]/orcamento/actions.ts, web/src/components/quote-pay-form.tsx, web/src/components/embedded-checkout.tsx, web/src/content/quote-page.ts, web/src/lib/security-headers.ts, web/src/lib/security-headers.test.ts, web/src/lib/payment-route.ts, web/src/lib/stripe.ts, web/src/content/privacy.ts, .icm/docs/data-protection.md
- complexity: standard

## Problem

The pay button on a quote page (`/orcamento/<token>`) sends the couple or event client to
checkout.stripe.com for the deposit or balance and back — the same break in trust that
`reservar-embedded-checkout` removed from tour bookings. This advances the online-booking
objective — a guest books and pays without ever leaving the site — and is stub 2 of the
`embedded-checkout` scope (D-1, D-2), reusing the embedded component, the payment policy and the
publishable-key switch stub 1 shipped (merged in #175).

## Proposed change

Keep Stripe Checkout and show it inside the quote page (D-1, D-2). Everything behind the payment
is unchanged: `dueInstalment` decides what is payable, the Connect application fee is the
agreement's 6% of the instalment on a direct charge, the session lives
`QUOTE_SESSION_TTL_MINUTES` (60), the webhook and `reconcileQuoteReturn` record it through
`recordQuotePayment`, and the receipts go out once.

**The session (`lib/quote-checkout.ts`).** New quote sessions are minted as embedded Checkout
(`ui_mode` as `booking-checkout.ts` sets it, `redirect_on_completion: "always"`), with a
`return_url` of the quote page plus `?session_id={CHECKOUT_SESSION_ID}` — the same URL today's
`success_url` carries, so the token travels nowhere new (Stripe already holds it for the session's
hour). There is no `cancel_url`. `startQuoteCheckout`'s `redirect` outcome becomes an `embedded`
outcome carrying the session's client secret. Every rule in the module note still holds:

- an open session under today's terms **that is embedded** is reused — its client secret, not a
  second session;
- an open session under older terms, **or an open hosted session minted before this ships**, is
  expired at Stripe first and replaced (D-16) — a hosted session has no client secret and its URL
  is stripe.com;
- a completed session mints nothing; a failed delayed method mints anew;
- two racing taps record one session; the loser expires its own and returns the winner's client
  secret.

**The tap (`orcamento/actions.ts`).** `payQuote` keeps its throttle and token shape check. Before
minting it asks `isEmbeddedCheckoutConfigured()`; when that is false (publishable key missing,
malformed, or its mode contradicting the secret key or the deployment) the tap answers the
existing `refused: unconfigured` sentence and the reason reaches Sentry once, through the switch's
own reporting — never a redirect to stripe.com (D-15). On success it returns
`{ status: "payment", clientSecret, publishableKey, stripeAccount }` instead of calling
`redirect()`; `stripeAccount` is the connected account the session was created on, or `null`.
`isEmbeddedCheckoutConfigured`'s doc comment, which today names the quote page as needing only
the secret key, is corrected.

**The payment step (`quote-pay-form.tsx`, D-12, D-13).** On a `payment` answer the pay-button
block (button, conditions notice, "secure payment" line) is replaced in place by the payment
step: one line naming what is being paid ("Sinal — 576 €" / "Deposit — €576", from the button's
own instalment and amount), `EmbeddedCheckout` with the returned secret, key and account, and a
"back" control. The quote and payments cards and the terms above are untouched. "Back" makes no
server call: it shows the pay button again, and the next tap reuses the still-open session under
the never-two-sessions rule. The loading and failure text are localized; the failure block
carries "back" and points at the contacts already on the page, and never redirects. Copy lives in
`content/quote-page.ts`, PT and EN. Phone width: the step sits in the page's existing
`max-w-2xl` column, full width at 375px.

**After paying (D-14).** Stripe navigates the tab to `/{locale}/orcamento/<token>?session_id=…` —
the page as today: `reconcileQuoteReturn` records a paid session and the "confirming" notice or
the paid instalment state shows; a delayed method shows "awaiting".

**Security policy.** `PAYMENT_ROUTE_SOURCES` gains `/:locale(pt|en)/orcamento/:path*`, so the quote
page is served `PAYMENT_CSP` and `PAYMENT_PERMISSIONS_POLICY` (Apple Pay / Google Pay inside the
frame) exactly as `/reservar` is; `isPaymentRoutePath` in `lib/payment-route.ts` admits the same
paths, and the quote pay form runs the same one-time reload backstop if its document was not
loaded on a payment route. The quote page is already `force-dynamic`, so nothing about caching
changes. Every other public route and every `/admin` route serves exactly the headers it serves
today. `EmbeddedCheckout`'s note ("only the booking route's policy admits the script") names both
routes. No new third party.

**Privacy.** The privacy policy (PT and EN, `content/privacy.ts`) still says quote instalments
redirect to checkout.stripe.com, and its "what we collect" paragraph still says the payment
happens on a Stripe-hosted page. Both are rewritten: Stripe's form is shown inside our booking
page and inside the quote page, loaded only when the guest presses pay, and Stripe may set its
fraud-prevention cookies there. `lastUpdated` moves to the build date. The Stripe row in
`.icm/docs/data-protection.md` drops "redirect for a quote instalment until
`quote-embedded-checkout` ships" for "embedded in `/reservar` and on the quote page". Same PR, per
the data-protection rule. `MARKETING_CONSENT_VERSION` is untouched (the opt-in wording does not
change).

## Acceptance criteria

- [ ] Tapping pay for a deposit or a balance never navigates to a stripe.com address; Stripe's payment form appears in the quote page where the pay button was, under a line naming the instalment and amount.
- [ ] "Back" on the payment step shows the pay button again without a server call; tapping pay again within the hour mounts the same Stripe session (no second session is created).
- [ ] A successful test card payment ends on `/{locale}/orcamento/<token>?session_id=…`, the instalment shows as paid on the quote page and in admin, and the receipts go out once, as today.
- [ ] The session carries the Connect application fee (6% of the instalment) exactly as today when `STRIPE_CONNECTED_ACCOUNT_ID` is set, and none when it is unset; its `expires_at` is still 60 minutes from the tap.
- [ ] An open embedded session under today's terms is reused; one under older terms, or an open hosted session minted before this ships, is expired before its replacement is minted; a lost race expires its own session and returns the winner's client secret.
- [ ] The `return_url` is the quote page plus `?session_id={CHECKOUT_SESSION_ID}`, and the session has no `success_url` or `cancel_url`; the token appears in no other new URL, log line or metadata.
- [ ] With the publishable key missing or mode-mismatched, a pay tap shows the existing "unavailable" sentence, reports once, and does not redirect.
- [ ] If the embedded form fails to load, the couple sees a localized message with "back" and is never redirected to stripe.com.
- [ ] `/pt/orcamento/<token>` and `/en/orcamento/<token>` serve `PAYMENT_CSP` and `PAYMENT_PERMISSIONS_POLICY`; every other public route and every `/admin` route serves exactly the headers it serves today.
- [ ] The payment step reads correctly in PT and EN and fits at 375px wide.
- [ ] The privacy policy (PT and EN) and the Stripe row in `.icm/docs/data-protection.md` describe the embedded form on both the booking and the quote page, and no longer mention a redirect to checkout.stripe.com.
- [ ] Unit tests cover: an embedded session is minted with `return_url` and no `success_url`/`cancel_url`; reuse returns the open session's client secret; an open hosted session is expired and replaced; the race path returns the winner's client secret; `payQuote` returns the payment payload instead of redirecting and refuses when the publishable key is not configured; the quote route is in the payment-route sources.

## Out of scope

- Refunds, admin quote tools, the Sales board and the emails — unchanged.
- The UAT "There was an error processing your request." payment error (D-4) — a separate bug lane.
- A custom card form (Stripe's Payment Element) (D-1).
- Which payment methods are offered, and Stripe Checkout branding — Stripe dashboard settings.
- Registering the domains with Stripe for Apple Pay — an operator act (dashboard → Payment method domains); until done, Apple Pay does not show in the frame.
- Expiring the session on "back" (D-13) — a quote holds no car, and the open session is reused.

## Open questions

- Non-blocking: payment methods that hand off to a bank or wallet (iDEAL, Bancontact, Klarna) leave the page by their nature and return to the `return_url`; the "never stripe.com" criteria are proven with a card. Same as `/reservar`.
- Decisions made here, continuing the scope's numbering after `reservar-embedded-checkout`'s D-5–D-11: D-12 the payment step replaces the pay-button block in place; D-13 "back" returns to the button and keeps the session; D-14 after paying the tab lands on the quote page with `?session_id=` as today; D-15 no publishable key → the "unavailable" refusal, never a redirect; D-16 an open hosted session from before the switch is expired and replaced.
