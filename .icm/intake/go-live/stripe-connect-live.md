# Stub: Connect goes live — platform profile, Diogo & Rita's account, one webhook, three env values

- feature-slug: stripe-connect-live
- epic: go-live
- priority: P0
- size: M
- depends-on: none
- sequence: 2 of 6
- blocked: human — Stripe controls the clock on Diogo & Rita's Standard-account verification (ID + IBAN). Platform account **live-activated** (Jamie, 2026-09-11); Connect platform profile and their account still to do tonight
- sources: `web/src/lib/stripe.ts` (direct charges via `stripeAccount`; fee only when `STRIPE_CONNECTED_ACCOUNT_ID` is set), `web/src/lib/booking-checkout.ts` (`commissionOn` when connected), `web/src/app/api/stripe/webhook` event list; `.icm/docs/launch-runbook.md` § Track C; decision 2026-09-10: launch with Connect, fee on from booking one, agreement signed after

## Problem

The commission code is built and sandbox-verified (application fee 4%, min €10, cap €50,
refunded pro-rata). None of it has met a live account. The remaining steps are human and
sequential: the Connect platform profile gates creating a live connected account;
Diogo & Rita's account needs their ID and IBAN in the room; the live webhook must listen
to connected-account events; three Production-only env values switch the site from
sandbox to real money. Setting `STRIPE_CONNECTED_ACCOUNT_ID` *is* switching the fee on.

## Proposed change

Tonight with Diogo & Rita (runbook § Track C): complete the Connect platform profile
(Standard, Stripe-hosted onboarding, connected account bears disputes); Connect →
Accounts → Create → Standard → onboarding link, which Diogo completes on his phone;
record `acct_…` in the password manager; weekly payouts, Stripe receipt email off. Add
the **live** webhook `https://agorasim.pt/api/stripe/webhook` listening on connected
accounts with the six event types. Env values go into Vercel **Production only** when
`go-live-on-landing` runs — never a `sk_test_` on the live domain, never a live key on
previews.

## Acceptance criteria (rough)

- [ ] Platform profile complete; their Standard account connected and verified; `acct_` in the password manager, not in the repo
- [ ] Live webhook exists with the six events, signing secret in the password manager
- [ ] Session read-back after the €1 test: webhook 200s, booking row's commission columns, fee visible on both dashboards

## Prompt

In the agorasim repo, read `.icm/intake/go-live/stripe-connect-live.md` and
`.icm/docs/launch-runbook.md` § Track C. Every box is Jamie's — do not touch Stripe or
Vercel env. Your work: when Jamie reports the €1 live test, verify from the repo side
(the booking's commission audit columns via the admin Sales board, the webhook route's
expected event list vs the live endpoint's, both emails' sender and content) and report
discrepancies. `git mv` this stub to `.icm/intake/go-live/_done/` only when Jamie
confirms all three boxes. PR on a `claude/` branch; CI is the source of truth.
