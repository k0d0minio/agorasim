# AGORA-014 · First testable version: sandbox payments end-to-end on agorasim.jamienisbet.com

| | |
|---|---|
| Status | ready |
| Type | config |
| Priority | P0 |
| Size | S |
| Depends on | AGORA-012 (correct availability model) · AGORA-013 (commission engine, sandbox) |
| Sources | Jamie's direction, 2026-08-27 (supersedes the 24 Aug promise framing) · icm-board `workspaces/deals/diogo-rita/DEAL.md` |

## Problem

**Rescoped 2026-08-27.** The old framing (live keys + €1 real-money proof on a Vercel
URL, promised for 24 Aug) is retired: there is **no new promised date**, and the
objective is a first working version for Diogo & Rita's testing **ASAP**. The current
production URL is **agorasim.jamienisbet.com**; while in active development, payments
run in **Stripe sandbox/test mode within Jamie's account** — their own Stripe account
does not exist yet and is not a blocker for this. **Live keys and agorasim.pt come
later, together, at the domain switchover (AGORA-006)** — the domain is being
recovered from their previous provider, independently of development.

## Acceptance

- [ ] agorasim.jamienisbet.com serves the current `main` (with AGORA-005's rescued
      content and AGORA-012's availability model).
- [ ] Test-mode booking end-to-end on a phone: pick a date/slot → pay with a Stripe
      test card → confirmed → appears on the Sales board → refund path works, with
      the sandbox application fee recorded (proves AGORA-013's wiring).
- [ ] Confirmation emails firing (Resend) in both locales.
- [ ] Preview/staging noindex stays on — this URL must not be indexed before the
      agorasim.pt switch.
- [ ] The URL + a short "how to test it" note handed to Jamie to send to Diogo &
      Rita, and the 15-minute phone admin walkthrough offered.

## Prompt

Get the agorasim first testable version working end-to-end. Read
.icm/intake/AGORA-014-live-payments-vercel-golive.md — the goal is SANDBOX payments on
agorasim.jamienisbet.com (test keys, Jamie's Stripe account), not live money. Verify
the booking flow on a phone viewport, confirm emails and the Sales board, keep
noindex on, and report exactly what Jamie should send Diogo & Rita to test. Env/key
values are human steps — name them, never commit them. Open a PR on a claude/ branch;
do not run local checks — CI is the source of truth.
