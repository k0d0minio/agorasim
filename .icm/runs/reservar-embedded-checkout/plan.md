# Plan: reservar-embedded-checkout

Build's execution plan in passes — each pass one layer of the change, in the order it lands, so
a session that resumes mid-build sees where it is. Written by the advisor pass (Define, or
Build's first act on `sonnet` after reading the spec), executed pass by pass, and rewritten when
reality disagrees with it — never left describing a plan that was abandoned.

## Passes

1. **Keys and headers** — `web/src/lib/stripe.ts` (`STRIPE_PUBLISHABLE_KEY`, `keyModeMismatch` extended to it and to secret/publishable agreement, missing pk = payments off), `web/src/lib/security-headers.ts` (a payment policy derived from `PUBLIC_CSP` + Stripe's documented embedded-Checkout origins; a `Permissions-Policy` delegating `payment`), `web/next.config.ts` (serve both on `/:locale/reservar` and below only, ordered so the generic public header does not also apply) — done when: unit tests show the payment policy equals `PUBLIC_CSP` plus only the Stripe additions, and the key-mode cases pass.
2. **Server: session in embedded mode + release on back** — `web/src/lib/booking-checkout.ts` (`ui_mode` embedded, `return_url` → `/reservar/confirmacao?session_id={CHECKOUT_SESSION_ID}`, no `success_url`/`cancel_url`; return `clientSecret`; a release function that expires the session of a `pending` booking only), `web/src/app/[locale]/reservar/checkout-actions.ts` (`startCheckout` returns `{ clientSecret, publishableKey, summary }` instead of `redirect`; a `releaseCheckout` action keyed to the booking just started, throttled like `startCheckout`) — done when: action tests show no redirect, a client secret returned, fee and `expires_at` unchanged, release refuses a non-pending or foreign booking.
3. **Client: the payment step** — `web/package.json` (`@stripe/stripe-js`, `@stripe/react-stripe-js`), new `web/src/components/embedded-checkout.tsx` (lazy `loadStripe` on mount, the embedded form, load-failure state; built to be reused by stub 2), `web/src/components/booking-checkout-form.tsx` (on success swap the form for summary + payment step + back; back saves nothing new, calls `releaseCheckout`, restores from the draft), `web/src/lib/checkout-draft.ts` (restore triggered by back rather than the `cancel_url` flag; retire the flag only if nothing else reads it), `web/src/content/` (PT/EN strings: back, step heading, load failure) — done when: on the preview, Pay and book shows the frame in place at 375px and desktop, back restores the form, a 4242 test payment lands on `/reservar/confirmacao`.
4. **Privacy and records** — `web/src/content/privacy.ts` (PT + EN cookies paragraph), `.icm/docs/data-protection.md` (Stripe row) — done when: both describe the embedded form and no text claims nothing is embedded.

## Risks

- Stripe API version naming for embedded mode (`ui_mode: "embedded"` vs a newer value) differs across `stripe@22` API versions — confirm against the installed SDK's types, not memory.
- The CSP origins: take them from Stripe's current CSP page for embedded Checkout; a missing origin shows as a blank frame and a CSP violation in the console on the preview — check the console on the smoke.
- `next.config.ts` header ordering: two matching `source` entries both apply; the generic public CSP must exclude the payment route or the browser enforces both (the stricter wins → blank frame).
- Apple Pay will not show until the operator registers the domains in Stripe; that is expected, not a bug.
- The webhook's `checkout.session.expired` handler is the only thing that frees the car on back — verify on the preview that the row goes `expired` within seconds.
