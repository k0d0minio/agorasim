# Stub: The day-before reminder — "Tomorrow is the big day"

- feature-slug: day-before-reminder
- epic: lifecycle-messages
- priority: P1
- size: M
- depends-on: daily-dispatcher
- sequence: 4 of 6
- sources: info PDF §2.6 ("Reminder/day before: Olá, Tomorrow is the big day, here is some information about the meeting point"); meeting points in `web/src/content/logistics.ts` (Sintra pin / Lisbon pin, matching §2.6 exactly)

## Problem

The §2.6 reminder — the message that stops no-shows and wrong-city arrivals — exists
only as a fixture on the admin preview. Nothing sends it.

## Proposed change

A dispatcher job: every confirmed booking departing tomorrow (Europe/Lisbon) gets the
§2.6 reminder in the guest's locale — meeting point address + Google Maps pin for its
tour, departure time (for Óbidos, the honest time copy per `content-truth/obidos-truth`
until the client commits times), what to bring/weather line, both phones. Idempotent
via the message log; skips cancelled/refunded bookings.

## Acceptance criteria (rough)

- [ ] Booking for tomorrow → exactly one reminder, right tour's meeting point + pin
- [ ] Cancelled/refunded bookings never reminded
- [ ] PT/EN; logged; CI green

## Prompt

In the agorasim repo (`web/`), build the day-before reminder job per
`.icm/intake/lifecycle-messages/day-before-reminder.md`: register it on the daily
dispatcher (same epic — must be merged), select tomorrow's confirmed bookings
timezone-safely, compose from `web/src/content/emails.ts` additions in the client's
§2.6 voice with the tour's meeting point from `web/src/content/logistics.ts`, send +
log idempotently. PR on a `claude/` branch; no local checks — CI is the source of
truth.
