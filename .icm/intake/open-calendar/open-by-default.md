# Stub: Every departure is open unless blocked

- feature-slug: open-by-default
- scope: open-calendar
- personas: guest, team
- initiative: ③ Instant booking / objective: the calendar is kept up to date by two non-technical people from a phone, and guests see every day the business can actually run
- depends-on: none
- sequence: 1 of 3
- complexity: high
- priority: P1
- recommended-model: opus

## Problem

A departure nobody has opened cannot be booked, so a busy week with no time to open days sells
nothing. The default is the wrong way round for a business with no fixed days off.

## Proposed change

A departure is bookable unless the team blocked it, a wedding or event holds the day, or it is
full. Guests booking online may book up to six months ahead (this month and the next five) and
at least two calendar days ahead: on a Monday, Wednesday is the first bookable day. Diogo &
Rita's own bookings (phone, cash) ignore the notice, the window and the block, but still respect
capacity. Every path that asks "can this departure be sold?" gets the same answer.

## Acceptance criteria (rough)

- [ ] A date with no calendar entry, 2+ days out and inside six months, can be booked online.
- [ ] A blocked departure cannot be booked online; the other departure that day still can.
- [ ] Today and tomorrow are refused online, in Portuguese time; the day after is accepted.
- [ ] A date past the six-month window is refused online.
- [ ] A manual booking can be added for today, tomorrow, or a blocked day while a driver and a car are free.
- [ ] A day held by a paid wedding or event stays off sale for guests.
- [ ] Every existing closed departure stays blocked with its note; nothing is deleted.
- [ ] The current admin calendar shows an untouched day as on sale, not as undecided, until admin-block-days replaces it.

## Out of scope (this feature)

- The new admin blocking screen (admin-block-days).
- The guest picker's look (guest-calendar-polish).
- Recurring closures.

## Notes for Define

- D-1 open by default · D-2 six-month window · D-3 two calendar days' notice, online only ·
  D-4 manual bookings skip notice, window and block, capacity still applies.
- Open: does the weather move skip the notice and allow blocked days, like the manual booking?
- Open: should the enquiry form refuse today, tomorrow and dates past six months, or keep taking
  any day as a lead?
- Before promotion, Diogo & Rita must block their known days off on production — a runbook line
  for Release, not code.
- touches: web/src/lib/availability.ts (+ test), web/src/db/schema.ts (comment only — no
  migration expected), web/src/lib/departure-window.ts, web/src/lib/manual-booking.ts,
  web/src/lib/booking-move.ts, web/src/app/[locale]/reservar/actions.ts + checkout-actions.ts,
  web/src/app/admin/calendar/actions.ts, web/src/components/admin/availability-calendar.tsx
  (chip state only).
