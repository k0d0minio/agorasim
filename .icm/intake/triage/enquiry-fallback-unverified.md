# Stub: Nothing verifies the enquiry fallback the launch plan depends on

- lane: chore
- found-by: sandbox-e2e-handover pass (`.icm/intake/booking-live/sandbox-e2e-handover.md`) · 2026-08-31
- priority: P2
- size: S

## Problem

`web/src/lib/stripe.ts` documents the launch plan's contingency for Stripe activation
slipping: ship the site with slot-pick and pay offline, which "is not a branch or a
revert — it is simply this deployment with no `STRIPE_SECRET_KEY` set". Three
surfaces read `isStripeConfigured()` to honour that — `/reservar` offers the enquiry
form instead of checkout (`page.tsx:63`), the checkout action refuses rather than
half-selling (`checkout-actions.ts:144`), and the confirmation page resolves to
"unknown" (`confirmacao/page.tsx:143`).

Nothing tests any of it. `grep isStripeConfigured` across `src/**/*.test.ts*` returns
nothing, and it cannot be checked on agorasim.jamienisbet.com either, because that
deployment has the sandbox key set — so the one path the launch plan falls back to is
the one path never exercised. The sandbox handover stub lists "the enquiry fallback
still works with Stripe env unset" as an acceptance line; that line went unverified
for exactly this reason.

The risk is not hypothetical: `generateMetadata` and the page body both branch on
`canCheckout`, and `bookingPage()` also folds in `tours.length > 0 && anyOpenings`.
A fallback that renders a half-built checkout, or a title promising payment over an
enquiry form, would only be discovered on the day it is needed.

## Proposed change

Cover the branch where it is decided rather than by deploying a second preview: a
test around `bookingPage`'s `canCheckout` and the `startCheckout` refusal with
`STRIPE_SECRET_KEY` unset in the environment, asserting the enquiry form renders,
its metadata matches, and the action returns its refusal rather than throwing.
`vitest` already stubs env elsewhere in this suite — follow whatever that does.

Worth pairing with a one-off manual check on a throwaway preview with the key
removed, since the deploy-time shape (no key at build, no key at runtime) is the
thing the tests cannot fully stand in for.

## Acceptance criteria (rough)

- [ ] With no `STRIPE_SECRET_KEY`, `/reservar` is asserted to render the enquiry form
- [ ] Its metadata is asserted to describe the enquiry form, not checkout
- [ ] `startCheckout` is asserted to refuse rather than throw
- [ ] CI green

## Prompt

In the agorasim repo (`web/`): the Stripe-unset enquiry fallback documented in
`web/src/lib/stripe.ts` has no test coverage anywhere, and it is the launch plan's
contingency if Stripe activation slips. Read
`.icm/intake/triage/enquiry-fallback-unverified.md` for the three surfaces that
branch on `isStripeConfigured()`. Add tests that pin the fallback: with the key
unset, `/reservar` renders the enquiry form (not checkout), `generateMetadata`
describes that form, and the `startCheckout` server action refuses rather than
throwing. Follow whatever pattern the existing suite already uses for stubbing env.
PR on a `claude/` branch; no local checks — CI is the source of truth.
