# Stub: The launch plan's Stripe-unset fallback finally has a test

- feature-slug: stripe-unset-fallback-test
- epic: go-live
- priority: P1
- size: S
- depends-on: none
- sequence: 8 of 9
- sources: re-cut from the purged `triage/enquiry-fallback-unverified` (found 2026-08-31, purged 2026-09-11 — `git log -- .icm/intake/triage`); `web/src/lib/stripe.ts` (the contingency in its own words: "not a branch or a revert — simply this deployment with no `STRIPE_SECRET_KEY` set"); the three surfaces that branch on `isStripeConfigured()` — `reservar/page.tsx`, `checkout-actions.ts`, `confirmacao/page.tsx`; `grep isStripeConfigured src/**/*.test.ts*` → nothing; `.icm/docs/launch-runbook.md` § Track C ("If their account is not verified when the domain lands: go live with `STRIPE_SECRET_KEY` unset")

## Problem

The runbook's contingency for Diogo & Rita's Stripe account not being verified on the
night is to go live with no Stripe key and take bookings by hand from the enquiry form.
Three surfaces branch on that state and none is tested; the sandbox deployment has always
had a key, so the one path the plan falls back to is the one path never exercised. A
half-built checkout, or a page title promising payment over an enquiry form, would be
discovered on the day it is needed.

## Proposed change

Cover the branch where it is decided: tests around the booking page's `canCheckout` and
`generateMetadata`, and the checkout action's refusal, with `STRIPE_SECRET_KEY` unset in
the environment — asserting the enquiry form renders, its metadata describes an enquiry
not a checkout, and the action returns its refusal rather than throwing. Follow whatever
the suite already does to stub env. Pair it with one manual look at a throwaway preview
with the key removed (Jamie), since deploy-time shape is what tests cannot fully stand in
for.

## Acceptance criteria (rough)

- [ ] With no `STRIPE_SECRET_KEY`, `/reservar` is asserted to render the enquiry form with enquiry metadata
- [ ] The checkout action is asserted to refuse rather than throw; CI green

## Prompt

In the agorasim repo (`web/`), read `.icm/intake/go-live/stripe-unset-fallback-test.md`.
Write vitest coverage for the Stripe-unset branch of `src/app/[locale]/reservar/page.tsx`
(`canCheckout`, `generateMetadata`) and the refusal in the checkout action, with
`STRIPE_SECRET_KEY` unset; touch no production code unless a test proves it wrong. `git mv`
the stub to `_done/` in the same PR, on a `claude/` branch; no local checks — CI is the
source of truth.
