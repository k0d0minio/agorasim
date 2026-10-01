# Tasks: balance-request-not-on-event-day

The queue, with a definition of done per item. Ticked by the stage that finishes the item —
a human checkbox, never a script's. The definition of done is seeded from the spec's
acceptance criteria when the run is opened; the queue is Build's own, one line per commit-sized
step, so a resuming session can pick up the first unticked line.

## Definition of done

- [ ] The T−14 balance request never goes out on the event's own day; it still goes out on the
- [ ] The T−7 balance reminder never goes out on the event's own day; it still goes out on T−1
- [ ] `listQuotesDueForBalance` and `listQuotesForBalanceReminder` floor `event_date` at
- [ ] `balance-schedule.test.ts` covers the edge for both predicates: event day → false, T−1 →
- [ ] `cron/balance-scheduler.test.ts` covers a run on the event morning: no request and no
- [ ] The "Saldo por pagar" panel and the quote-card badge (`isBalanceFlagged`,
- [ ] CI green

## Queue

- [ ] <task — small enough for one commit; name the file or area>
