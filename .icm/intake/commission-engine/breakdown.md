# Breakdown: Commission engine — Stripe Connect application fees

- epic-slug: commission-engine
- sources: Commission & Payments Agreement (.icm/docs/agorasim-commission-and-payments-agreement.pdf — unsigned, intended instrument per DEAL.md 2026-08-27); proposal §4–5; D6, D16 (2026-08-29); purged AGORA-013; 2026-08-29 data lens (no Connect code exists anywhere)

## What I understood

The whole business case of the €2,000 discount is the commission: 4% of the tour
booking total (min €10, cap €50) and 6% on weddings/events taken proportionally on
each payment, collected as Stripe Connect **application fees** on Agorasim's own
account, with commission refunded pro-rata when a booking is refunded. Zero Connect
code exists: `checkout.sessions.create` takes the full amount to the platform account,
and no schema field records a fee. Built sandbox-first on Jamie's platform account
with a test connected account; the client's real account (not yet created) and the
**signed** agreement (D16) both gate live activation — neither gates this build.

## Build order

1. connect-scaffolding — connected-account plumbing, env, sandbox account — depends-on: none
2. tour-application-fees — 4%/€10/€50 on checkout + per-booking audit fields — depends-on: connect-scaffolding
3. refund-machinery — refund webhooks, `refunded` write-path, proportional fee refund, seat release — depends-on: tour-application-fees

## Out of scope (whole epic)

- The 6% events fee — computed here (shared fee module) but charged by
  `quote-flow/payment-links`, which depends on this epic's scaffolding.
- Chasing the client's Stripe account creation and the agreement signature — deal
  folder actions (DEAL.md open items), not repo tickets.
