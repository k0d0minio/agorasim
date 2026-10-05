# Stub: One helper for a booking's logistics facts, rows and day-shift — not five copies

- lane: chore
- found-by: day-before-reminder release review · 2026-09-24
- complexity: medium

## Problem

The code that builds the logistics facts for an email (catalogue title with slug fallback, mode
words, `departureLabel`, `departureTimeFollowsByEmail`, `meetingPoints`, add-on names,
`partyLabel`) now exists in `web/src/lib/booking-checkout.ts:640-660`,
`web/src/lib/booking-move.ts:355-372`, `web/src/lib/cron/day-before-reminder.ts` and partly in
`booking-cancellation.ts` / `booking-refund.ts`. The details rows plus the text part's pin line
are copied three times in `web/src/lib/booking-emails.ts` (confirmation, move, reminder). A day
is added to a date key four ways (`quotes.ts` `shiftDays`, `availability.ts:798`,
`departure-window.ts:91`, `cron/day-before-reminder.ts` `reminderDays`). A change to how a
departure or meeting point is shown has to be made in about five places, and a missed copy
makes the reminder and the confirmation disagree about where and when to meet.

## Proposed change

Extract `bookingLogisticsFacts(booking, catalogue, locale)` next to the email facts, a
`logisticsRows(facts, locale)` / text-lines helper in `booking-emails.ts`, and move
`shiftDays` into `lib/availability.ts`. Point every caller at them. No behaviour change, and the
existing email tests stay green unchanged.

## Prompt

In the agorasim repo, read `.icm/intake/triage/booking-logistics-facts-shared.md`. Extract the
three helpers it names, point every copy at them with no change in rendered output (the email
tests in `web/src/lib/booking-emails.test.ts` and `web/src/lib/cron/day-before-reminder.test.ts`
must pass unchanged), and `git mv` the stub to `_done/` in the PR, on a `claude/` branch; CI is
the source of truth.
