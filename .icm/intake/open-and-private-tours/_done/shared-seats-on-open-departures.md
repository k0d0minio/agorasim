# Stub: Guests who book per person share a car on the same departure

- feature-slug: shared-seats-on-open-departures
- epic: open-and-private-tours
- sequence: 1 of 3
- depends-on: none
- complexity: high
- priority: P1

## Problem

A per-person booking takes a whole car today. Two couples who book the 10:00 Rural Saloia
departure separately take two cars and two drivers. Diogo sells an open group tour: other
people can join the same car. The engine says one thing and the business does another, and the
site cannot say "others can join" until the engine does it.

## Proposed change

A per-person booking on a departure joins a car that already has a per-person booking, when the
seats allow it. A new car is taken only when no open car has room. A private group booking keeps
its own car. Capacity for an open departure counts seats. Capacity for a private departure counts
cars and drivers, as today.

## Acceptance criteria

- [ ] Two per-person bookings of 2 adults each on the same Rural Saloia departure take one small classic, not two.
- [ ] A per-person booking of 4 adults on a departure whose open car has 1 seat left takes a second car.
- [ ] A private group booking never shares its car.
- [ ] The admin calendar and the Sales board show the shared car and its guests on the departure.
- [ ] The guest calendar shows a departure as available while any car has a seat, and as full when none has.
- [ ] Unit tests cover both modes at the seat limit, in summer and winter time.
- [ ] Manual and cash bookings follow the same rule.

## Out of scope

- The copy on the site (stub 2).
- Parties above 8. They keep the enquiry route.

## Notes

- Decisions this stub leaves open. Jamie answers them in the pull request before the build:
  1. May two strangers' bookings share one small classic (3 seats)? Default: yes. The feedback says other people can join.
  2. Does a shared departure need a minimum of 2 adults in the car before it runs? Default: no. The Óbidos public minimum of 2 adults per booking stays as today.
  3. May the team move a guest from a shared car to another car on the day? Default: yes, from the day sheet, as today.
- Today's rule is written at `web/src/lib/fleet.ts` lines 29 to 33 and `web/src/lib/availability.ts` lines 28 to 30: every booking is private to its vehicle. `assignVehicle` at `fleet.ts` line 183 picks a small classic for 1 to 3 guests and the T3 for 4 to 8.
- Files it will touch: `web/src/lib/fleet.ts`, `web/src/lib/availability.ts`, `web/src/lib/booking-checkout.ts`, the admin calendar day sheet, `web/src/db/schema.ts` if a booking needs a vehicle assignment column it does not have.
