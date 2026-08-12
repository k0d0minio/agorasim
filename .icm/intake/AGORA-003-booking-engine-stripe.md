# AGORA-003 · Booking engine with real availability and Stripe payment

| | |
|---|---|
| Status | in-progress |
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

- [x] `availability` schema in Drizzle + migration (date, slot, capacity, status).
- [x] Admin calendar management usable from a phone (reuse the admin mobile patterns —
      this is Diogo & Rita's daily tool).
- [x] Public calendar on `/reservar` reads real availability, server-checked.
- [x] Stripe Checkout: full payment, price from the server, webhook confirms → booking on
      the Sales board + availability consumed; abandoned/failed payments handled (slot
      hold with expiry, or optimistic release).
- [x] PT/EN confirmation emails (Resend) to customer and to Diogo/Rita.
- [x] Tests to the standard of the existing suite; **test-mode Stripe end-to-end on a
      phone is still to do** — it needs a real deployment with keys, and nobody has run
      it yet.
- [x] CI green.

## What is left before this can be closed

The engine is built and merged; two things outside the code stand between it and a real
booking, so the ticket stays open until both are done.

1. **Prices.** Every catalogue entry is unpriced, which makes it unsellable by design —
   `/reservar` offers the enquiry form instead of a checkout. Real prices are AGORA-002,
   blocked on Diogo & Rita's Section 1 answers. Entering them at `/admin/experiences`
   turns payment on; no deploy involved.
2. **Configuration and the phone rehearsal.** Set `STRIPE_SECRET_KEY` (a `sk_test_…` key
   labels the checkout as test mode), `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_SITE_URL`,
   `RESEND_API_KEY`, `BOOKING_EMAIL_FROM`, `BOOKING_NOTIFICATION_EMAILS` — all documented
   in `web/.env.example`. Subscribe the webhook endpoint to `checkout.session.completed`,
   `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`
   and `checkout.session.expired`. Then run the plan's own definition of done: open a
   day, book it on a phone with a Stripe test card, and check the day closes, both emails
   arrive, and the booking is on the Sales board.

Leaving `STRIPE_SECRET_KEY` unset is the plan's Stripe-slips fallback (Risks table),
already working: slot-pick through the enquiry form, pay offline. The day-10 decision is
therefore a configuration choice, not a code change.

## Prompt

Build the real booking engine for the agorasim site. Read
.icm/intake/AGORA-003-booking-engine-stripe.md and .icm/docs/launch-plan.md (Phase 2,
Decisions, Risks) for full context. Start with the availability schema and admin calendar;
wire Stripe Checkout with server-side prices and a confirming webhook. Open PRs on claude/
branches per coherent slice; do not run local checks — CI is the source of truth.
