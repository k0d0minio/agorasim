# Stub: Compute the online window once per read, and drop the unused `inOnlineWindow` flag

- lane: chore
- found-by: open-by-default release review · 2026-10-01
- complexity: low

## Problem

`describeSlot` (`web/src/lib/availability.ts`) recomputes `onlineWindow(today)` and
`teamHorizonEnd(today)` for every departure — about 370 times per `/reservar` render and up to
360 per picker mount — though both depend only on `today`. `SlotAvailability.inOnlineWindow`
is read only by tests and rides in every admin calendar payload, a fourth near-identical flag
next to `onSale`, `bookable` and `hasRoom`. (The new `addDays` is one more copy of the date-key
day shift; that dedupe is already `booking-logistics-facts-shared.md`'s.)

## Proposed change

Compute the two bounds once in `describeMonth` / `readDepartureWindow` / `checkDayBookable`
and pass them to `describeSlot` (or memoise per `today`); remove `inOnlineWindow` from
`SlotAvailability` and rewrite the two tests that read it against `onSale`/`hasRoom`. No
behaviour change.

## Prompt

In the agorasim repo, read `.icm/intake/triage/availability-online-window-tidy.md`. Make the
change with no behaviour change (`web/src/lib/availability.test.ts`, `manual-booking.test.ts`
and `booking-move.test.ts` pass with only the `inOnlineWindow` assertions rewritten), and
`git mv` the stub to `_done/` in the PR, on a `claude/` branch; CI is the source of truth.
