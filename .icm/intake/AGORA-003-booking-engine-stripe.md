# AGORA-003 · Booking engine with real availability and Stripe payment

| | |
|---|---|
| Status | ready |
| Type | feature |
| Priority | P1 |
| Size | L |
| Depends on | AGORA-002 for real prices (schema work can start before) |
| Sources | [.icm/docs/launch-plan.md](../docs/launch-plan.md) Phase 2 |

## Problem

The public calendar is hardcoded August 2026 with invented busy days, and there is no
payment path. The launch model is real-time availability with full payment online (Stripe)
at booking; fallback if Stripe activation slips is slot-pick → pay offline (decide by day
10 — see the plan's Risks table).

## Acceptance

- [ ] `availability` schema in Drizzle + migration (date, slot, capacity, status).
- [ ] Admin calendar management usable from a phone (reuse the admin mobile patterns —
      this is Diogo & Rita's daily tool).
- [ ] Public calendar on `/reservar` reads real availability, server-checked.
- [ ] Stripe Checkout: full payment, price from the server, webhook confirms → booking on
      the Sales board + availability consumed; abandoned/failed payments handled (slot
      hold with expiry, or optimistic release).
- [ ] PT/EN confirmation emails (Resend) to customer and to Diogo/Rita.
- [ ] Tests to the standard of the existing suite; test-mode Stripe end-to-end on a phone.
- [ ] CI green.

## Prompt

Build the real booking engine for the agorasim site. Read
.icm/intake/AGORA-003-booking-engine-stripe.md and .icm/docs/launch-plan.md (Phase 2,
Decisions, Risks) for full context. Start with the availability schema and admin calendar;
wire Stripe Checkout with server-side prices and a confirming webhook. Open PRs on claude/
branches per coherent slice; do not run local checks — CI is the source of truth.
