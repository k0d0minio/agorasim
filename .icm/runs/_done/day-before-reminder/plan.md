# Plan: day-before-reminder

Build's execution plan in passes — each pass one layer of the change, in the order it lands, so
a session that resumes mid-build sees where it is. Written by the advisor pass (Define, or
Build's first act on `sonnet` after reading the spec), executed pass by pass, and rewritten when
reality disagrees with it — never left describing a plan that was abandoned.

## Passes

1. **The query** — `web/src/lib/bookings.ts` (+ `bookings.test.ts`): a `confirmedBookingsOn(date)`
   beside `bookingsBetween`, `status = 'confirmed'` only (not `holdsCapacitySql`), slot in
   morning/afternoon, left-joined to `tour_requests` for name + email, returning id, ref,
   tourRequestId, locale, date, experienceSlug, slot, mode, the party bands `partyLabel` reads,
   addOns. No schema change, no migration. — done when: the test proves pending/expired/
   cancelled/refunded rows are excluded and cash rows included.
2. **The copy + template** — `web/src/content/emails.ts` (a `reminderEmails` block, PT/EN, both
   variants, the Óbidos line), `web/src/lib/booking-emails.ts` (`guestReminderEmail(facts,
   variant)` reusing `BookingEmailFacts`' shape where it fits — no `total`, no `cancelUrl` —
   the email layout, `departureLabel`, `meetingPoints`, `departureTimeFollowsByEmail`,
   `site.contacts`) (+ `booking-emails.test.ts`). — done when: tests render both variants in
   PT and EN for Rural Saloia and Óbidos, the Óbidos line and pin present/absent as specified,
   no money and no cancel link, PT text has no gendered greeting.
3. **The job** — `web/src/lib/cron/day-before-reminder.ts`: Lisbon today/tomorrow from an
   injectable clock (`BUSINESS_TIME_ZONE`), facts assembled per booking the way
   `booking-checkout.ts:643` does, `sendLoggedEmail` with `kind: "day-before-reminder"`,
   `subjectDate: booking.date`, counts per variant into the summary; `register()` at module
   scope. Delete `noop.ts`; swap the import in `app/api/cron/dispatch/route.ts` and its comment.
   (+ a job test with the db and `sendLoggedEmail` mocked.) — done when: the test shows a
   rerun yields only duplicates, the catch-up only reaches today's un-reminded bookings, a
   no-email row is counted as skipped, and the summary string carries the counts.
4. **Privacy copy** — `web/src/content/privacy.ts`: add the day-before reminder to the PT and
   EN transactional-email lists (legal-basis and Resend paragraphs). — done when: both
   locales name it.
5. **Ready flip** — PR ready, `ci-status.sh day-before-reminder` → GREEN on the full gate and
   the preview.

## Risks

- Lisbon date off by one around midnight/DST — signal: the tomorrow test at 23:30 UTC in
  winter/summer picks the wrong day. Compute with `Intl` in `BUSINESS_TIME_ZONE`, never
  `toISOString().slice(0, 10)` on the server clock.
- The catch-up re-sending to yesterday's reminded bookings — signal: a duplicate is counted
  as sent. The claim key must be `(booking, booking.date)`, identical in both variants.
- `partyLabel` / facts typing tied to the checkout's `Booking` row — signal: the query has to
  select more columns than the spec lists; select what `partyLabel` needs, no more.
- The dispatcher's audit summary grows too long for a phone — keep it one line per job.
