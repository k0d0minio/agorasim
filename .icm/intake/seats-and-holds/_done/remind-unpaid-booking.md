# Stub: Rita reminds a guest of an unpaid booking with one tap

- feature-slug: remind-unpaid-booking
- epic: seats-and-holds
- sequence: 3 of 5
- depends-on: unpaid-bookings-hold-no-seat
- complexity: medium
- priority: P2

## Problem

A guest who leaves the checkout before payment leaves a `pending` booking. Rita has no way to
remind that guest. The admin has "Reenviar link" only for payment-link bookings
(`web/src/components/admin/payment-link-actions.tsx`).

## Proposed change

A pending booking on the Sales board has a "Lembrar" button. The button emails the guest a
fresh payment link for the same departure, party and price. The link checks the seats again when
the guest taps "Pagar".

## Acceptance criteria

- [ ] An unpaid booking from the site checkout shows a "Lembrar" button on its Sales card and its detail page.
- [ ] The button sends the guest an email in the booking's language, with the departure, the party, the total and a payment link.
- [ ] The link opens the payment page. When the departure has no seat left, the page says so and does not take payment.
- [ ] The card shows when the last reminder went, for example "Lembrete enviado 12/11 14:05".
- [ ] The audit log records each reminder.

## Out of scope

- Automatic reminders on a schedule.

## Notes

- Reuse `sendPaymentLink` in `web/src/lib/payment-link.ts` and its email. Check that it accepts a checkout booking, not only a payment-link booking (not verified).
- A message log row of a new kind keeps the reminders countable.
