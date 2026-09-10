# Stub: Two live Stripe accounts, one webhook, three env values — Jamie's checklist

- feature-slug: stripe-live-accounts
- epic: launch-cutover
- priority: P0
- size: M
- depends-on: none
- sequence: 13 of 14
- blocked: human — Stripe live activation on Jamie's platform account; Diogo & Rita's account creation with ID + IBAN; D16 decision (fee switches on with the connected id — see Q4 in the runbook)
- sources: `web/src/lib/stripe.ts` (direct charges via `stripeAccount`, fee only when `STRIPE_CONNECTED_ACCOUNT_ID` is set), `web/src/lib/booking-checkout.ts:241` (`commissionOn` when connected), webhook route event list; `.icm/docs/launch-runbook.md` § Track C; D16

## Problem

All the payment code is built and sandbox-verified; none of it has met a live account.
Going live is entirely human work on Stripe's side, and it has a clock Stripe controls
(identity and business verification). Nothing in the repo listed those steps in order,
or said plainly that connecting the client's account is the same act as switching the
commission on.

## Proposed change

This stub is the checklist, mirrored from the runbook: platform live activation +
Connect platform profile; the client's Standard account (their NIF, IBAN,
representative) connected to the platform; a live webhook on the platform listening to
connected-account events with the six event types; `STRIPE_SECRET_KEY`,
`STRIPE_WEBHOOK_SECRET`, `STRIPE_CONNECTED_ACCOUNT_ID` in Vercel **Production only**
(previews keep sandbox); the €1 live booking + admin refund with fee visible on both
dashboards. Session work is limited to reading back the result: webhook 200s, the
booking row's commission audit columns, both emails. If activation slips past Friday
18:00, Production launches with `STRIPE_SECRET_KEY` unset — the documented fallback —
never with a test key.

## Acceptance criteria (rough)

- [ ] Both accounts live; connected `acct_` recorded in the password manager, not here
- [ ] Live webhook receives and 200s the €1 test's events
- [ ] €1 booking confirmed → refunded; fee taken and returned on both dashboards
- [ ] D16 decision written in the deal folder before the connected id is set

## Prompt

In the agorasim repo, read `.icm/intake/launch-cutover/stripe-live-accounts.md` and
`.icm/docs/launch-runbook.md` § Track C. Every box is Jamie's — do not touch Stripe or
Vercel env. Your work: after Jamie reports the €1 test, verify from the repo side (the
booking row's commission columns via the admin, the webhook route's expectations vs the
live endpoint's event list, both emails' content) and report discrepancies. Move this
stub to `_done/` only when Jamie confirms all four boxes.
