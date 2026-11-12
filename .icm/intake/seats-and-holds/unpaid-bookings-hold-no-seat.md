# Stub: Only a paid booking takes a seat on a departure

- feature-slug: unpaid-bookings-hold-no-seat
- epic: seats-and-holds
- sequence: 2 of 5
- depends-on: none
- complexity: medium
- priority: P1

## Problem

A checkout holds its car for 30 minutes before payment (`HOLD_MINUTES`, `web/src/lib/bookings.ts`).
The admin shows the held seats as taken, and other guests cannot book them. A lapsed hold stops
counting, but the booking stays `pending` with "Pagamento pendente" until the weekly retention
job runs `expireLapsedHolds`. Diogo and Rita say an unpaid booking must not occupy a seat.

## Proposed change

An unpaid booking does not count as a booked seat in the admin. The checkout keeps only the
short hold that question 1 for Jamie gives, so two guests cannot pay for the last seat. A lapsed
hold leaves the departure and the "Pagamento pendente" state at once.

## Acceptance criteria

- [ ] The admin calendar and the Sales board count only paid bookings as booked seats.
- [ ] A booking in checkout shows as "A aguardar pagamento", apart from the booked seats.
- [ ] The checkout hold lasts the time that question 1 gives. The guest page says that time.
- [ ] A hold that lapsed does not show as "Pagamento pendente" on the Sales board, and its seats are free on the guest calendar.
- [ ] Two guests who start a checkout for the last seats at the same moment do not both pay for them.

## Out of scope

- The reminder button (`remind-unpaid-booking`).
- Payment-link bookings. They already hold no car until the guest taps "Pagar".

## Notes

- Decision open: question 1 for Jamie in `breakdown.md`. Keep the Spec approved gate.
- Files: `web/src/lib/bookings.ts` (`HOLD_MINUTES`, `holdsCapacity`, `holdsCapacitySql`, `expireLapsedHolds`), `web/src/lib/retention.ts`, `web/src/app/api/cron/dispatch/route.ts`, the admin calendar and Sales board cards.
- The guest copy "Guardamos o vosso carro durante 30 minutos" is in the booking content and changes with the hold time.
