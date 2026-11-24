# Handoff jam-501

## Next action

1. Jamie said on 2026-11-24 that he added the Stripe Connect webhook secret.
2. Jamie reads the pull request and ticks Ready to merge. Then `release JAM-501`.
3. The go-live acts (the live endpoints, the Production values, the build, the live test) are in JAM-571.

## How to test

There is no page to see. CI runs the tests of the route: an event that the platform endpoint signed and an event that the Connect endpoint signed both get 200, and a wrong signature gets 400. On UAT, with only `STRIPE_WEBHOOK_SECRET` set, the sandbox webhook still shows 200s in the Stripe dashboard.

## Blockers

- none

## Do not touch

- none
