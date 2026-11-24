# Handoff jam-501

## Next action

1. Jamie adds the line `STRIPE_CONNECT_WEBHOOK_SECRET=` under `STRIPE_WEBHOOK_SECRET=` in `web/.env.example`. The session cannot read that file (permission rule).
2. Jamie reads the pull request and ticks Ready to merge. Then `release JAM-501`.
3. At the switch to Connect (runbook Track C): Jamie makes two live endpoints in Stripe. He sets `STRIPE_WEBHOOK_SECRET` to the platform endpoint's secret and `STRIPE_CONNECT_WEBHOOK_SECRET` to the Connect endpoint's secret in Vercel Production.

## How to test

There is no page to see. CI runs the tests of the route: an event that the platform endpoint signed and an event that the Connect endpoint signed both get 200, and a wrong signature gets 400. On UAT, with only `STRIPE_WEBHOOK_SECRET` set, the sandbox webhook still shows 200s in the Stripe dashboard.

## Blockers

- none

## Do not touch

- none
