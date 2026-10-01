# Stub: Block days the Airbnb way in the admin calendar

- feature-slug: admin-block-days
- scope: open-calendar
- personas: team
- initiative: ③ Instant booking / objective: the calendar is kept up to date by two non-technical people from a phone, and guests see every day the business can actually run
- depends-on: open-by-default
- sequence: 2 of 3
- complexity: medium
- priority: P1
- recommended-model: sonnet

## Problem

The admin calendar has five ways to open, close and clear days, a season window and a driver
stepper on every tap. Diogo & Rita are not technical; once days are open by default, all they
need is to say which days they are off.

## Proposed change

One gesture: tap one or several days, or the first and last day of a stretch. A bar appears
with "Bloquear dia inteiro", "Só manhã", "Só tarde" and "Desbloquear". Each day reads at a
glance as open, partly blocked, blocked, held by an event, or full, with its bookings shown.
Tapping a single day also shows that day's bookings, events and "Nova reserva", with the driver
count and the private note under "Mais opções". Blocking a day with bookings is allowed; the
bookings stay and the panel says so. The old opening tools are removed.

## Acceptance criteria (rough)

- [ ] Rita can block a whole week from her phone with three taps and one confirm.
- [ ] She can block only the morning or only the afternoon of a day.
- [ ] She can unblock a day the same way.
- [ ] Blocking a day with a booking warns ("1 reserva neste dia — continua marcada") and keeps the booking.
- [ ] One day's panel shows its bookings, events and "Nova reserva"; drivers and note sit under "Mais opções".
- [ ] "Abrir tudo", "Abrir fins de semana", the season window, the range-pick button and "Limpar" are gone.
- [ ] The intro text above the calendar says, in one or two plain sentences, that every day is open and how to block one.
- [ ] Works one-handed on a 320px-wide phone.

## Out of scope (this feature)

- Recurring closures.
- The rule itself (open-by-default).
- The guest picker.

## Notes for Define

- D-5 the gesture · D-6 single-day panel keeps bookings, events and Nova reserva · D-7 drivers
  and note under "Mais opções" · D-8 block allowed over bookings, with a warning · D-9 the opening
  tools are removed.
- Admin Portuguese comes from .icm/docs/admin-pt-inventory.md.
- touches: web/src/components/admin/availability-calendar.tsx,
  web/src/app/admin/calendar/page.tsx, web/src/app/admin/calendar/actions.ts.
