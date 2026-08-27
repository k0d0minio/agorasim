# AGORA-015 · Weddings & car hire: admin quote builder, deposit + balance links

| | |
|---|---|
| Status | ready |
| Type | feature |
| Priority | P1 |
| Size | L |
| Depends on | AGORA-013 (6% fee engine) · AGORA-005 (weddings page + enquiry live) |
| Sources | AgorasimProposal §5 + feature #6 · info PDF §2.3 (quote per event, 3–4 months lead) · Jamie's decision, 24 Aug 2026: admin quote builder |

## Problem

Proposal feature #6 — the paid car-hire/weddings flow — exists only as copy and mock
data. The agreed flow: **30% deposit** via a custom payment link to hold the date,
**balance auto-collected 14 days before** the event, confirmations and reminders
automatic, **6% commission on each payment**. The non-refundable window was never
defined — **use a sensible default (non-refundable inside 30 days of the event, free
date-change before that) until Diogo & Rita confirm** (Jamie, 27 Aug; the question
lives in icm-board `workspaces/deals/diogo-rita/open-questions.md`). Weddings are quoted per event (§2.3), so someone has to
compose each quote: decision is an **admin quote builder** Diogo & Rita (or Jamie) use.

## Acceptance

- [ ] Quote schema (event date, vehicles, services — transport, photo session, flowers,
      wooden boards — location, total) + phone-first admin builder to the admin mobile
      spec.
- [ ] Creating a quote issues the 30% deposit payment link/session on the connected
      account with the 6% proportional fee; paying it holds the date (feeds the
      AGORA-012 calendar).
- [ ] Balance link generated and sent automatically at T−14 days (extend the existing
      cron), idempotent, with a reminder if unpaid; both payments visible per event.
- [ ] Deposit terms (non-refundable window — value from AGORA-019) shown on the pay page
      before payment; never silently enforced.
- [ ] Sales board shows event bookings with deposit/balance status.
- [ ] Email confirmations for deposit and balance in the guest's locale (SMS later,
      AGORA-018).
- [ ] CI green.

## Prompt

Build the agorasim weddings/car-hire quote and payment flow. Read
.icm/intake/AGORA-015-weddings-quote-builder-payment-links.md; reuse the AGORA-013 fee
engine, the existing cron route pattern, and lib/booking-emails.ts conventions. Do not
invent the non-refundable window — read it from the AGORA-019 answers. Open a PR on a
claude/ branch; no local checks — CI is the source of truth.
