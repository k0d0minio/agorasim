# Stub: The team closes one driver for a day, a morning or an afternoon

- feature-slug: one-driver-off-per-departure
- epic: bookings-and-payment-links
- sequence: 3 of 3
- depends-on: none
- complexity: medium
- priority: P1

## Problem

Diogo: "On the example 'Diogo in doctor' how are we able to close the availability just for one
driver? On dashboard we can only select morning or afternoon." The day panel's blocking bar
offers "Bloquear dia inteiro", "Só manhã", "Só tarde" and "Desbloquear". A driver stepper exists
under "Mais opções" but it sets both departures of the day at once and goes no lower than one.

## Proposed change

The blocking bar gains a second row: "Só um condutor" for the whole day, the morning or the
afternoon. One departure can run with one driver while the other keeps two. The day reads at a
glance as "1 de 2 condutores" where it applies. The guest calendar sells the remaining capacity.

## Acceptance criteria

- [ ] The day panel offers "Só um condutor" for the day, the morning and the afternoon, next to the existing blocks.
- [ ] Setting it on the morning leaves the afternoon at two drivers.
- [ ] The month view shows the affected departure as "1 de 2 condutores livres".
- [ ] The guest calendar offers at most one booking on that departure, and the manual booking dialog refuses a second.
- [ ] "Desbloquear" restores two drivers.
- [ ] Works one-handed at 320 px width.

## Out of scope

- Naming which driver is off.
- Zero drivers on a departure. That is a block.

## Notes

- Decision this stub leaves open. Jamie answers it in the pull request before the build:
  1. Keep the stepper under "Mais opções"? Default: remove it. The new buttons replace it.
- Model: one `availability` row per date and slot with `drivers` (default 2), `status` and `note` (`web/src/db/schema.ts` lines 767 to 806). `DRIVERS_PER_SLOT` and `MAX_DRIVERS_PER_SLOT` are 2 (`web/src/lib/fleet.ts` lines 123 and 126). `setDayRoster` (`web/src/lib/availability.ts` line 997) writes both slots. `dayRosterSchema` clamps to 1..2 (`web/src/lib/form-schemas.ts` lines 501 to 517). The bar and stepper are in `web/src/components/admin/availability-calendar.tsx` lines 567 to 643 and 721 to 724.
