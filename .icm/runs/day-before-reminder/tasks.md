# Tasks: day-before-reminder

The queue, with a definition of done per item. Ticked by the stage that finishes the item —
a human checkbox, never a script's. The definition of done is seeded from the spec's
acceptance criteria when the run is opened; the queue is Build's own, one line per commit-sized
step, so a resuming session can pick up the first unticked line.

## Definition of done

- [ ] The 06:00 dispatch sends one reminder per confirmed booking dated tomorrow (Europe/Lisbon), Stripe and cash alike, in the booking's locale, with the meeting point linked to its pin; pending holds, expired, cancelled and refunded bookings get none
- [ ] The same run sends the "today" variant to a confirmed booking dated today that has no reminder row, and nothing to one already reminded yesterday
- [ ] A rerun the same morning sends nothing (log claim); a booking moved to a new date is reminded for the new date; a failed send is retried on the next run
- [ ] The PT copy is gender-neutral; the Óbidos reminder carries the "call or message Diogo or Rita" line with both numbers and Rural Saloia's does not; no money line and no cancellation link in either locale
- [ ] A booking with no enquiry or no email is skipped and counted without failing the job
- [ ] The dispatcher's audit row names `day-before-reminder` and its sent / already reminded / skipped / failed counts per variant; `noop.ts` and its import are gone
- [ ] The privacy policy's PT and EN email lists name the day-before reminder
- [ ] Unit tests cover the query's status filter, the Lisbon today/tomorrow computation, both template variants in PT and EN (Óbidos and Rural Saloia), and the once-only rule; CI green

## Queue

- [x] Query — `confirmedBookingsOn` + `remindableOnSql` in `web/src/lib/bookings.ts`, filter test in `bookings.test.ts` (594850f)
- [x] Copy + template — `bookingEmails.reminder` in `web/src/content/emails.ts`, `guestReminderEmail` in `web/src/lib/booking-emails.ts`, tests (594850f)
- [x] Job — `web/src/lib/cron/day-before-reminder.ts` registered on the dispatcher, `noop.ts` deleted, route import swapped, job test (594850f)
- [x] Privacy — PT/EN email lists + last-updated date in `web/src/content/privacy.ts` (594850f)
- [ ] CI GREEN on the draft head → merge `origin/main` + `origin/uat` → flip ready → push → full GREEN
