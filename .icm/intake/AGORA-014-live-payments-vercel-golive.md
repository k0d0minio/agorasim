# AGORA-014 · Go live on the Vercel URL: live keys, €1 proof, hand-off

| | |
|---|---|
| Status | today |
| Type | config |
| Priority | P0 |
| Size | S |
| Depends on | AGORA-012 (correct model) · AGORA-013 (commission before first booking) |
| Blocked by | Stripe activation of Agorasim's account — external, in progress; chase status today |
| Sources | .icm/docs/launch-runbook.md · Jamie's promise to Diogo & Rita: live booking + payment, Vercel URL first, DNS cutover (AGORA-006) after |

## Problem

The promise for 24 Aug is a **bookable link with real payment** — on the Vercel
production URL first; the agorasim.pt DNS cutover follows as AGORA-006. Everything is
currently on test keys, and their Stripe account is mid-onboarding (the runbook's #1
external risk). This ticket is the go-live choreography around that external gate.

## Acceptance

- [ ] Stripe activation status checked today; if cleared: live keys + live webhook
      endpoint/secret set in Vercel env (human step — Jamie, never committed).
- [ ] Production deploy serving on the Vercel URL; preview noindex stays on until the
      DNS cutover.
- [ ] Live €1 test booking end-to-end on a phone: paid → confirmed → on the Sales board
      → refunded, with the application fee refunding proportionally (proves AGORA-013).
- [ ] Confirmation emails firing in production (Resend key + verified from-address).
- [ ] URL shared with Diogo & Rita + the 15-minute phone admin walkthrough booked.
- [ ] If activation has NOT cleared by end of day: the same URL goes to them in enquiry
      mode (documented fallback — no `STRIPE_SECRET_KEY`), with an honest note that
      payment flips on the moment Stripe clears — no fake promises.

## Prompt

Run the agorasim Vercel go-live. Read .icm/intake/AGORA-014-live-payments-vercel-golive.md
and .icm/docs/launch-runbook.md. Key entry and the live €1 charge are human actions —
prepare and verify everything around them and hand Jamie the exact steps in order. Do not
run local checks — CI is the source of truth.
