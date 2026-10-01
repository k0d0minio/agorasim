# Breakdown: Open calendar — everything bookable unless Diogo & Rita block it

- scope-slug: open-calendar · story: runs/open-calendar/01_scope/_source/story.md
- initiative: ③ Instant booking / objective: the calendar is kept up to date by two non-technical people from a phone, and guests see every day the business can actually run
- personas: team, guest

## What I understood

Today a departure nobody has opened cannot be booked, so Diogo & Rita must open every day by
hand before anyone can buy it. Jamie wants it the Airbnb way round: every departure is open,
and the team only blocks the days they are off. Guests can book up to six months ahead and need
two days' notice; the team's own phone and cash bookings ignore both. The admin calendar shrinks
to one gesture — tap days, then block or unblock — with the driver count and the note tucked
away. The guest calendar on /reservar gets an Airbnb-style finish.

## Where it sits

The booking engine's supply side: the availability rule every booking path asks (online
checkout, enquiry, manual booking, weather move), the admin Calendar screen, and the date picker
on /reservar.

## Build order

1. open-by-default — flip the rule: no entry is open; add the 6-month window and the 2-day notice for online bookings; the team's manual bookings skip both — depends-on: none
2. admin-block-days — rebuild the admin calendar around "tap days → Bloquear / Desbloquear"; remove the opening tools — depends-on: open-by-default
3. guest-calendar-polish — Airbnb-style guest picker on /reservar — depends-on: open-by-default

## Parallelizable

- admin-block-days and guest-calendar-polish, once open-by-default has merged: their `touches:`
  guesses do not overlap (the admin calendar screen vs. the /reservar picker).

## Out of scope (whole scope)

- Recurring weekly closures.
- Capacity changes: a third driver, seat sharing, more departures.
- Wedding and event holds, prices, payment, cancellations, refunds.
- Telling a guest when their booked day is later blocked.
- Syncing with Google Calendar or any outside calendar.
