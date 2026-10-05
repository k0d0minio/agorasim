# Plan: quote-embedded-checkout

Build's execution plan in passes — each pass one layer of the change, in the order it lands, so
a session that resumes mid-build sees where it is. Written by the advisor pass (Define, or
Build's first act on `sonnet` after reading the spec), executed pass by pass, and rewritten when
reality disagrees with it — never left describing a plan that was abandoned.

## Passes

1. **Policy and route** — `lib/security-headers.ts` (`PAYMENT_ROUTE_SOURCES` + `/:locale(pt|en)/orcamento/:path*`), `lib/payment-route.ts` (`isPaymentRoutePath` admits `/orcamento/…`), `components/embedded-checkout.tsx` (note names both routes), `lib/stripe.ts` (`isEmbeddedCheckoutConfigured` comment no longer exempts the quote page); tests in `security-headers.test.ts` and the payment-route test — done when: the quote route is in the sources, `next.config.ts` (unchanged, it maps the array) serves the payment headers there, and every other route's headers test is unchanged.
2. **The session** — `lib/quote-checkout.ts`: embedded `ui_mode` + `redirect_on_completion: "always"` + `return_url` (quote page `?session_id={CHECKOUT_SESSION_ID}`), no `success_url`/`cancel_url`; outcome `redirect` → `embedded { clientSecret, stripeAccount }`; reuse only an open embedded session under today's terms (`client_secret` present), expire an open hosted or older-terms one first (D-16); the race path returns the winner's secret; module note's token paragraph names `return_url` only. Tests in `quote-checkout.test.ts` (the existing describe blocks, rewritten from `url` to `clientSecret`) — done when: every existing branch test passes on the new outcome and the three new cases (hosted expired, no success/cancel url, winner's secret) are in.
3. **The tap** — `app/[locale]/orcamento/actions.ts`: gate on `isEmbeddedCheckoutConfigured()` → `refused: unconfigured` (D-15); return `{ status: "payment", clientSecret, publishableKey, stripeAccount }`; drop `redirect`. Test file for the action (new, beside it, mirroring `reservar/checkout-actions.test.ts`) — done when: payload returned, refusal on a missing publishable key, throttle unchanged.
4. **The payment step** — `components/quote-pay-form.tsx` + `content/quote-page.ts` (PT/EN: the "paying" line, loading, failure, back): on `payment` state replace the button block with the line, `EmbeddedCheckout`, "back" (client state only, D-13); reload backstop via `documentLoadedOnPaymentRoute()` as the booking form does — done when: the form renders the step in both locales and "back" returns to the button.
5. **Privacy and processor record** — `content/privacy.ts` (PT/EN: the collect paragraph, the Stripe processor paragraph, the cookies paragraph; `lastUpdated`), `.icm/docs/data-protection.md` Stripe row — done when: no text says a quote instalment redirects or that payment happens on a Stripe-hosted page.

## Risks

- A hosted session opened in a tab before the deploy is paid after the replacement is minted: `recordQuotePayment` already records a non-current paid session and alerts a second charge — the signal is the Sentry "second-charge" alert.
- The Stripe SDK's typed `ui_mode` value differs from `booking-checkout.ts`'s — copy that file's exact value and type, do not guess.
- `PAYMENT_ROUTE_SOURCES` is also read by the booking form's backstop; widening `isPaymentRoutePath` must not make the booking form skip its reload when its document was loaded on `/orcamento` (a quote → reservar client nav does not exist today, but the check should stay per-route if trivially possible).
- `STRIPE_PUBLISHABLE_KEY` must exist on Preview and the `uat` environment for the smoke; Build runs `env.sh audit --changed` and stops (class 3) if absent.
