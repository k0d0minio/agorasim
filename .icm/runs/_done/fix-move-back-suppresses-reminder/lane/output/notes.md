# Bug: fix-move-back-suppresses-reminder

- observed: a booking moved back onto a date it had already been moved to (`X → A → B → A`) sent
  no `booking-moved` notice for the return, and — when the day-before reminder for `A` had already
  gone out before the round trip — sent no fresh reminder either, because `message_log`'s date-bound
  index keyed only on `(kind, recipient, booking, subject_date)` and the second visit to `A` found
  the first visit's row still claiming it · expected: a real move always earns its own notice, and a
  reminder is owed again for a date the booking returns to, while a retried request (not a real
  move) still sends nothing twice
- cause: `message_log_booking_date_kind_key` had no way to tell "the first time this booking was on
  this date" from "the second time" — a date repeats across a flip-flop and the unique index
  collapsed both visits into one claim
- fix: added `bookings.move_seq` (bumped on every real move in `booking-move.ts`, from the
  pre-move snapshot under the same guard that already protects `date`/`slot`) and
  `message_log.move_seq`, folded into the date-bound unique index alongside `subject_date`
  (`web/drizzle/0029_add_booking_move_seq.sql`); `lib/booking-move.ts` and
  `lib/cron/day-before-reminder.ts` now stamp every date-bound claim with the booking's current
  move-seq. A retried request never reaches the update (the existing `sameDeparture`/guarded-`WHERE`
  checks stop it before any claim is attempted), so idempotency for a genuine retry is unchanged.
- changelog: announce: none (repo has no changelog page — `_shared/project-rules.md` → Reporting)
- learned: none
