# Breakdown: Quote flow — weddings & events, one engine, two doors

- epic-slug: quote-flow
- sources: proposal feature ⑥ + §5 (30% deposit via payment link, balance 14 days before, 6% proportional); agreement §5; info PDF §2.3 (offer, quote-per-event, no distance limits, 3–4 months ahead); D9 (30-day non-refund default), D10 (two doors); PR #30 content; purged AGORA-015; 2026-08-29 data lens (no quote entity; free-text dates can't drive a T−14 job)

## What I understood

Weddings/events are quote-per-event: enquiry arrives (casamentos or eventos form,
`enquiry_kind` wedding/event — the enum exists, nothing writes it), Rita builds a
quote in the admin, the guest pays a 30% deposit via a payment link to hold the date,
and the balance is collected by a second, automatically issued link 14 days before
the event, each payment carrying its proportional 6% application fee. Today the only
home an event has is a `tour_requests` row with a **free-text** date — nothing a
scheduler can compute against. The deposit's non-refundable window defaults to 30
days (D9; client asked, [LAWYER] flagged on the sinal regime). The balance scheduler
rides the daily dispatcher from lifecycle-messages.

## Build order

1. quote-schema — quotes + per-payment child table, hard event date, terms fields — depends-on: none
2. admin-quote-builder — create/edit/send a quote from an enquiry — depends-on: quote-schema
3. payment-links — deposit + balance checkout links with 6% proportional fees — depends-on: admin-quote-builder
4. balance-scheduler — T−14 auto-issue + reminder — depends-on: payment-links
5. enable-wedding-event-forms — the two public doors go live — depends-on: payment-links

## Out of scope (whole epic)

- Gift vouchers (out, D13) and any package/tier pricing — quotes are bespoke by design
  ("quote per event depending on location", client's words).
- Wedding-specific cancellation beyond the deposit terms — revisit when the terms are
  client-confirmed.
