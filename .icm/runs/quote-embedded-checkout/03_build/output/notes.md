# Build notes: quote-embedded-checkout

- commits: cd7885b (payment policy on the quote route) · a115da1 (embedded quote sessions) · b032425 (pay action returns the payment step) · c2425d1 (payment step in the quote page) · bfdee98 (privacy + processor record)
- ci: GREEN (cheap tier, draft) on 450dd9d
- ci (full gate) : GREEN on fe2d4a7 — Vercel preview pass; Quality (advisory) RED on webhook/route.test.ts only, main's (see Notes for Release)
- ready: 2026-10-05T13:24:39Z — flipped on 1e19b16

## What changed

- `web/src/lib/security-headers.ts`: `PAYMENT_ROUTE_SOURCES` gains `/:locale(pt|en)/orcamento/:path*`; `next.config.ts` maps the array, so the quote page is served `PAYMENT_CSP` + `PAYMENT_PERMISSIONS_POLICY` exactly as `/reservar`. Comments in both name the two routes.
- `web/src/lib/payment-route.ts`: `isPaymentRoutePath` admits `/{locale}/orcamento/<anything>` (not the bare `/orcamento`), matching the sources.
- `web/src/lib/stripe.ts`: comment only — `isEmbeddedCheckoutConfigured` now gates the quote pay button too (D-15).
- `web/src/components/embedded-checkout.tsx`: comment only — both routes mount it.
- `web/src/lib/quote-checkout.ts`: sessions are `ui_mode: "embedded_page"`, `redirect_on_completion: "always"`, `return_url` = quote page + `?session_id={CHECKOUT_SESSION_ID}`; no `success_url`/`cancel_url`. Outcome `redirect` → `embedded { clientSecret, stripeAccount }`. Reuse only an open session that is embedded, has a client secret and today's terms; an open hosted or older-terms one is expired first (D-16). A reused session's `stripeAccount` is the account it was actually found on (`retrieveOwnedSession`), so a session from before Connect was configured still mounts.
- `web/src/app/[locale]/orcamento/actions.ts`: gate on `isEmbeddedCheckoutConfigured()` → `refused: unconfigured` before any session; return `{ status: "payment", payment: { clientSecret, publishableKey, stripeAccount } }`; no `redirect()`. New type `EmbeddedQuotePayment` (named to avoid the `@/db` `QuotePayment`).
- `web/src/components/quote-pay-form.tsx`: on `payment` the button block is replaced by `PaymentStep` — heading "Sinal — 576 €", "back", `EmbeddedCheckout` (loading + failure with back), the secure line. Back is client state only (D-13). One-time reload backstop as in the booking form.
- `web/src/app/[locale]/orcamento/[token]/page.tsx`: passes `instalment` and `amount` to the form; reconcile comment names the `return_url`.
- `web/src/content/quote-page.ts`: `paymentStep` copy, PT and EN.
- `web/src/content/privacy.ts`, `.icm/docs/data-protection.md`: the form is embedded on the booking and the quote page; no redirect to checkout.stripe.com anywhere; `lastUpdated` → 5 October 2026. `MARKETING_CONSENT_VERSION` untouched.
- Tests: `quote-checkout.test.ts` rewritten from `url` to `clientSecret` on every mint/reuse/race case, plus embedded params (no success/cancel url), the hour-long expiry, and the hosted-session replacement; new `orcamento/actions.test.ts` (payload, missing and mismatched publishable key, outcome mapping, throttle/token); `security-headers.test.ts` quote-route cases.

## Acceptance criteria status

- [ ] Never navigates to stripe.com; form where the button was, under the instalment line — implemented (no `redirect`, `PaymentStep`); proven on the preview smoke.
- [ ] Back shows the button without a server call; the next tap mounts the same session — back is client state; reuse returns the open session's secret (test); end to end on the preview smoke.
- [ ] Test card payment ends on `/{locale}/orcamento/<token>?session_id=…`, paid on the page and in admin, receipts once — `return_url` asserted; the reconcile/webhook path is unchanged; end to end on the preview smoke.
- [x] Connect fee as today, none without Connect; `expires_at` 60 min — tests.
- [x] Reuse / older terms / hosted / race — tests.
- [x] `return_url` only, no `success_url`/`cancel_url`; token in no metadata — tests.
- [x] Missing or mode-mismatched publishable key → "unavailable", reported once, no redirect — `actions.test.ts` (the report is `isEmbeddedCheckoutConfigured`'s, tested in `stripe.test.ts`).
- [ ] Form fails to load → localized message with back, no redirect — implemented (`EmbeddedCheckout` failure block); preview smoke (block `js.stripe.com` in devtools).
- [x] Quote route serves the payment headers; others unchanged — `PAYMENT_ROUTE_SOURCES` test; `next.config.ts` unchanged in logic.
- [ ] PT/EN, 375px — copy in both locales; visual, preview smoke.
- [x] Privacy (PT/EN) and the Stripe row — done.
- [x] Unit tests cover the six named cases — `quote-checkout.test.ts`, `orcamento/actions.test.ts`, `security-headers.test.ts`.

## Notes for Release

- **Quality (advisory) is red on fe2d4a7 — not this run's.** Five tests in `web/src/app/api/stripe/webhook/route.test.ts` (refund cases, lines 543–659) fail on `main` since #181; the cause and the 3-line test-only fix are in #196 (`chargesRetrieve.mockReset()` in `beforeEach`). Everything this run touched passed (79 of 80 files). Release step 7's main merge carries the fix once #196 merges; not ported here (Build contract: never absorb another ticket's fix). `error.log` has the entry.

- Review closely: the reuse condition in `checkoutFor` (`ui_mode`, `client_secret`, terms) and that every path that used to return a URL now returns a client secret; `retrieveOwnedSession`'s account capture.
- A hosted session open at deploy time (≤ 60 min old) is expired on the next tap; if the couple pays it in an older tab anyway, `recordQuotePayment` already records a non-current paid session and alerts a second charge.
- Context budget: read `reservar/checkout-actions.test.ts`, `booking-checkout-form.tsx` (payment step + backstop), `src/proxy.ts` (quote matcher, CSP untouched) and `next.config.ts` beyond `touches:` — the reuse of stub 1's shapes and the header ordering needed them. `next.config.ts` changed by a comment only.
