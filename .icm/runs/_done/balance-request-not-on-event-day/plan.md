# Plan: balance-request-not-on-event-day

Build's execution plan in passes — each pass one layer of the change, in the order it lands, so
a session that resumes mid-build sees where it is. Written by the advisor pass (Define, or
Build's first act on `sonnet` after reading the spec), executed pass by pass, and rewritten when
reality disagrees with it — never left describing a plan that was abandoned.

## Passes

1. **The predicates** — `web/src/lib/balance-schedule.ts`: `isRequestInWindow` →
   `daysBetween(today, eventDate) >= 1`; `isReminderDue` → `daysLeft < 1 || daysLeft > 7`
   returns false; module docblock and both function docs say "the day before the event" instead
   of "not past" — done when: `balance-schedule.test.ts` asserts event day → false and T−1 →
   true for both predicates (the existing "asks up to and on the event day" case is rewritten,
   not kept alongside).
2. **The queries** — `web/src/lib/quotes.ts`: `listQuotesDueForBalance` and
   `listQuotesForBalanceReminder` floor `event_date` with `gte(quotes.eventDate,
   shiftDays(today, 1))`; their docblocks ("It stops at today", "between today and seven days
   out") corrected — done when: both queries and both predicates name the same edge.
3. **The job and its test** — `web/src/lib/cron/balance-scheduler.ts`: the header comment's
   "not past (the query's floor…)" becomes "the day before the event at the latest"; no logic
   change there. `web/src/lib/cron/balance-scheduler.test.ts`: the mocked
   `listQuotesForBalanceReminder` floor moves to `today + 1` to mirror the real query; the
   mocked `listQuotesDueForBalance` stays floorless so the job's own `isRequestInWindow` guard
   is what the test exercises. New cases: a run on the event morning sends no request (deposit
   paid the evening before) and no reminder (request sent at T−3), and leaves the quote's link
   digest unchanged; a run at T−1 still sends each — done when: the suite covers both edges.
4. **CI** — push, read `ci-status.sh` → GREEN (no local build/lint/typecheck/test).

## Risks

- The existing test "asks the morning after a deposit paid inside T−14" or other fixtures may
  sit on the event day (`shift(EVENT, 0)` with `morning(n)`); a red test that only fails because
  its fixture lands on T−0 is updated, not skipped — signal: a reminder/request case at
  `morning(0)` going red.
- `isBalanceFlagged` / `listUnpaidBalancesDue` must not be touched — the event-day balance has
  to stay on the panel.
