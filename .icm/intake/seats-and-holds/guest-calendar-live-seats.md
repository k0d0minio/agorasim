# Stub: The booking calendar shows the seats left now

- feature-slug: guest-calendar-live-seats
- epic: seats-and-holds
- sequence: 4 of 5
- depends-on: open-group-rides-the-van
- complexity: low
- priority: P1

## Problem

On UAT on 2026-11-12, `/pt/reservar` offered 28 November 14h00 to a third couple after two
couples held both cars. The checkout then said "Essa partida deixou de estar disponível". The
page is rendered with `revalidate = 3600` (`web/src/app/[locale]/reservar/page.tsx`), and a new,
paid or expired booking does not revalidate it.

## Proposed change

The calendar reads the seats at request time, or each booking change revalidates `/reservar` in
both languages. The guest sees a full departure as full before the checkout.

## Acceptance criteria

- [ ] After a booking fills a departure, a fresh load of `/pt/reservar` and `/en/reservar` shows that departure as unavailable for a party that does not fit.
- [ ] After a hold lapses or a booking is cancelled, a fresh load shows the seats again.
- [ ] The checkout refusal stays as the last guard.

## Out of scope

- Live updates without a page load.
