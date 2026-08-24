# AGORA-013 · Stripe Connect commission engine (before the first real booking)

| | |
|---|---|
| Status | today |
| Type | feature |
| Priority | P0 |
| Size | M |
| Depends on | AGORA-003 (checkout this extends) |
| Sources | .icm/files/Commission-and-Payments-Agreement.docx · AgorasimProposal §4–5 · Jamie's decision, 24 Aug 2026: commission live before any real money moves |

## Problem

The signed commission agreement specifies **Stripe Connect application fees** on
Agorasim's **own** account (they remain merchant of record): tours **4% of the booking
total, floor €10, cap €50**; car hire & events **6%**, taken proportionally on each
payment; application fees refunded proportionally on refunds. The codebase has **zero
Connect code** — `stripe()` uses a plain secret key, and no commission is computed or
recorded anywhere. Jamie has decided this must be live **before the first real booking**,
so it sits in the launch critical path alongside their (in-progress) account activation.

Note: `.icm/docs/2026-07-collaboration-proposal.md` still describes a no-commission
model — it predates the signed agreement and must be reconciled so nobody quotes it.

## Acceptance

- [ ] Platform account + Connect setup documented in the launch runbook; Agorasim's
      account connected as a **Standard** connected account (flow must work with an
      account that finishes activation later).
- [ ] Checkout Sessions become direct charges on the connected account with
      `application_fee_amount` = clamp(round(4% × total), €10, €50), computed server-side
      in cents alongside the existing price computation.
- [ ] A 6% proportional fee path for event/car-hire payments (deposit and balance
      separately) — the engine AGORA-015 consumes.
- [ ] Refund path: application fee refunded proportionally; dashboard-refund flow
      re-documented in the runbook.
- [ ] Commission recorded per booking (amount, rate, floor/cap applied) for reporting and
      the 24-month review.
- [ ] Test-mode end-to-end with a test connected account; webhook signature verification
      unchanged.
- [ ] `2026-07-collaboration-proposal.md` annotated as superseded by the commission
      agreement.
- [ ] CI green.

## Prompt

Implement the agorasim commission model as Stripe Connect application fees. Read
.icm/intake/AGORA-013-stripe-connect-commission.md and the agreement in
.icm/files/Commission-and-Payments-Agreement.docx; the checkout lives in
web/src/lib/booking-checkout.ts + web/src/lib/stripe.ts, webhook in
web/src/app/api/stripe/webhook/route.ts. Never hard-code account ids or keys — env vars
only. Open a PR on a claude/ branch; no local checks — CI is the source of truth.
