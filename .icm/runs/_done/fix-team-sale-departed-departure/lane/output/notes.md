# Bug: fix-team-sale-departed-departure

- observed: at 15:00 the team could sell, or move a guest onto, today's 10:00 departure · expected: a departure of today is past once its time (10:00 / 14:00 Europe/Lisbon) has gone by
- cause: `describeSlot` set `past = date < today`, a day-granularity check, so every untouched departure of today stayed open after open-by-default
- fix: `web/src/lib/availability.ts`: `past` also true when today's departure time has passed (no grace window — settled with the operator), for both audiences; `web/src/lib/date-keys.ts`: `minutesOfDay`; tests at 09:59/10:01 and 13:59/14:01 in Lisbon summer and winter
- changelog: not user-visible (no changelog in this repo; team-only behaviour)
- learned: none
