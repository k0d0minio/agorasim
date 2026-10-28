# Stub: Two guests who pay for the last seat in the same second cannot both get it

- lane: bug
- found-by: open-and-private-tours/shared-seats-on-open-departures, question 7 · 2026-10-28
- complexity: medium
- priority: P2

## Problem

The capacity check and the insert of a booking are two statements with no lock between them.
Two checkouts in the same second can both read one free seat in an open car, or one free car,
and both write a booking. The departure is then over its seats or over its drivers. The checkout
(`web/src/app/[locale]/reservar/checkout-actions.ts` → `web/src/lib/booking-checkout.ts`), the
manual booking (`web/src/app/admin/calendar/actions.ts`) and the move
(`web/src/lib/booking-move.ts`) all check with `checkSlotAvailable` and then insert or update.

## Proposed change

Investigate. Serialize the check and the write per departure, for example with a transaction
advisory lock on the date and the slot.

## Acceptance criteria

- [ ] Two checkouts for the last seat of one departure in the same second give one booking and one refusal.
- [ ] Two checkouts for the last free car of one departure in the same second give one booking and one refusal.
- [ ] The manual booking and the move follow the same lock.
