### Q1. About 30 minutes after the guest leaves the checkout, the booking has the status `expired` in the database. Does "Lembrar" also show on these bookings?
- type: single
- options: Yes, on each unpaid checkout whose departure is not past | No, only while the booking is pending (about 30 minutes)
- default: Yes, on each unpaid checkout whose departure is not past
- answer: Yes, on each unpaid checkout whose departure is not past
- note: Jamie, in chat, 2026-11-23

### Q2. A reminder makes the booking a payment-link booking: it shows "Pagamento pendente" and holds no seat. How long does the reminder link work?
- type: single
- options: Until the departure day is past, as a payment link of the team | 7 days after the reminder
- default: Until the departure day is past, as a payment link of the team
- answer: Until the departure day is past, as a payment link of the team
- note: Jamie, in chat, 2026-11-23

### Q3. A new kind of message log row needs a migration: one new value in the enum `message_kind`. Does this run add it?
- type: single
- options: Yes, migration 0043, written after #277 is merged | No migration, the reminder uses the kind of the payment link and the audit log counts the reminders
- default: Yes, migration 0043, written after #277 is merged
- answer: Yes, migration 0043, written after #277 is merged
- note: Jamie, in chat, 2026-11-23

### Q4. A payment link of the team ignores the online notice rule: the guest can pay until the departure day. Does the reminder link do the same?
- type: single
- options: Yes, the same as a payment link of the team | No, the payment page refuses a departure that is too soon for an online booking
- default: Yes, the same as a payment link of the team
- answer: Yes, the same as a payment link of the team
- note: Jamie, in chat, 2026-11-23
