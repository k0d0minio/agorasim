# Stub: Open-group bookings on one departure share the VW T3, up to 8 guests

- feature-slug: open-group-rides-the-van
- epic: seats-and-holds
- sequence: 1 of 5
- depends-on: none
- complexity: high
- priority: P0
- blocked: questions 1 to 4 for Diogo and Rita in `breakdown.md`

## Problem

An open-group party of 1 to 3 guests gets a small classic of 3 seats. Two couples on one
departure take two cars and both drivers, and a third couple is refused. Diogo and Rita run an
open group in the VW T3: 8 guests and one driver. Reproduced on UAT on 2026-11-28 14h00.

## Proposed change

An open-group booking on Rural Saloia seats its party in the VW T3 of its departure. Parties
join the same van until its 8 seats are full. Only then does a second car start, as the answers
to the questions say. A private group keeps the car that its size gives today.

## Acceptance criteria

- [ ] Three open-group bookings of 2 adults each on one Rural Saloia departure share one VW T3 and use one driver.
- [ ] A fourth open-group booking of 2 adults on that departure joins the same van (8 of 8 seats).
- [ ] A fifth open-group booking on that departure gets the car and driver that question 3 gives, or the departure shows as full.
- [ ] The admin calendar shows the open van with its seats taken, for example "VW T3 · 6 de 8 lugares".
- [ ] A private booking of 2 adults on another departure still takes a small classic.
- [ ] When a private group holds the VW T3 on a departure, open-group bookings follow the answer to question 4.
- [ ] Unit tests in `web/src/lib/fleet.test.ts` and `web/src/lib/availability.test.ts` cover each line above.

## Out of scope

- Groups above 8 online.
- Óbidos. It already shares the touring vehicle.

## Notes

- This reverses question 1 of `open-and-private-tours/shared-seats-on-open-departures` (2026-10). That stub let strangers share a small classic.
- Files: `web/src/lib/fleet.ts` (`assignVehicle`, `joinableCar`, `slotFitsParty`), `web/src/lib/availability.ts` (`fitsParty`, `checkSlotAvailable`), `web/src/lib/bookings.ts` (`tallyOccupancy`), `web/src/components/booking-date-picker.tsx`.
- Existing open bookings on UAT keep their car. The change applies to new bookings. Rita moves old ones with "Mudar de carro" if she wants.
