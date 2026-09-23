# Stub: Refuse to start checkout when the Stripe key's mode contradicts the deployment

- feature-slug: stripe-env-guard
- epic: go-live
- priority: P1
- size: S
- depends-on: none
- sequence: 6 of 9
- sources: tech lens 2026-09-18 — `web/src/lib/stripe.ts:87-89` (`isTestMode()` reads the key prefix; its only caller is the checkout page's test-mode label, `web/src/app/[locale]/reservar/page.tsx:171`); no `VERCEL_ENV` check anywhere near Stripe; the rule is human-only in `.icm/docs/launch-runbook.md` §6 and `stripe-connect-live.md`

## Problem

"Never a `sk_test_` key on the live domain, never a live key on previews" is the most
consequential rule of the switch and nothing enforces it. A Production scope still holding
the sandbox key after DNS lands takes "bookings" nobody pays for; a live key pasted into
Preview lets every branch URL charge real cards. The env flip is a manual step on a busy
night; one assertion closes both failure modes.

## Proposed change

In the Stripe client factory: when `VERCEL_ENV` is `production`, the secret key must start
`sk_live_`; when `preview`, it must not. A mismatch throws before any session is created,
the checkout surfaces its existing "payments unavailable" state rather than a half-sale,
and `captureAlert` reports it so Jamie sees it in Sentry within the minute. Local
development (`VERCEL_ENV` unset) is unaffected. Cover both directions with a test.

## Acceptance criteria (rough)

- [ ] Production + `sk_test_` and Preview + `sk_live_` both refuse to create a Checkout session, alert, and render the payments-off state
- [ ] Production + `sk_live_`, Preview + `sk_test_`, and local unset all behave as today; CI green

## Prompt

In the agorasim repo (`web/`), read `.icm/intake/go-live/stripe-env-guard.md`. Add the
key-mode assertion to `src/lib/stripe.ts` (Production requires `sk_live_`, Preview forbids
it, unset `VERCEL_ENV` is unaffected), make the checkout page and action take the
payments-off path on a mismatch, report it through `src/lib/observability.ts`, and test
both directions. `git mv` the stub to `.icm/intake/go-live/_done/` in the same PR, on a
`claude/` branch; no local checks — CI is the source of truth.
