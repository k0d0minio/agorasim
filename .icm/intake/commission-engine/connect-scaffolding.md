# Stub: Stripe Connect scaffolding — the connected account the fees ride on

- feature-slug: connect-scaffolding
- epic: commission-engine
- priority: P1
- size: M
- depends-on: none
- sequence: 1 of 3
- sources: agreement §3 (guest pays into Agorasim's own Stripe account; platform linked via Connect; fee split at payment); DEAL.md (client account not created; sandbox on Jamie's account); `web/src/lib/stripe.ts` (plain platform client today)

## Problem

The agreement's money flow — guest pays the client's account, Stripe routes the
application fee to the platform — has no code: no connected-account id anywhere, no
Connect-aware client, no env var, no sandbox account to develop against.

## Proposed change

Create a test connected account in the platform sandbox (Standard account type — the
client keeps their own dashboard, matching "your Stripe account, your data").
Introduce `STRIPE_CONNECTED_ACCOUNT_ID` (documented in `.env.example`); make the
checkout/webhook paths run **on behalf of** the connected account when set and fall
back to today's platform-only behaviour when unset, so sandbox testing works before
the client's real account exists. Webhook handling must cope with events from the
connected account context.

## Acceptance criteria (rough)

- [ ] With the env set, a sandbox checkout session is created with the connected account as merchant
- [ ] With it unset, behaviour is unchanged (fallback documented)
- [ ] Webhook verifies and processes connected-account events
- [ ] CI green

## Prompt

In the agorasim repo (`web/`), add Stripe Connect scaffolding per
`.icm/intake/commission-engine/connect-scaffolding.md`: a `STRIPE_CONNECTED_ACCOUNT_ID`
env (documented in `web/.env.example` by name), a Connect-aware path in
`web/src/lib/stripe.ts` + `web/src/lib/booking-checkout.ts` where the session is
created for the connected account (destination-of-record = client), graceful fallback
to current platform-only behaviour when unset, and webhook compatibility in
`web/src/app/api/stripe/webhook/route.ts`. Consult `.icm/docs/agorasim-commission-and-payments-agreement.pdf`
§3 for the intended flow. No fee amounts yet — that is the next stub. PR on a
`claude/` branch; no local checks — CI is the source of truth. Never commit any key.
