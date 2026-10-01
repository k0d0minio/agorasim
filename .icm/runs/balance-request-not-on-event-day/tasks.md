# Tasks: balance-request-not-on-event-day

The queue, with a definition of done per item. Ticked by the stage that finishes the item —
a human checkbox, never a script's. The definition of done is seeded from the spec's
acceptance criteria when the run is opened; the queue is Build's own, one line per commit-sized
step, so a resuming session can pick up the first unticked line.

## Definition of done

- [ ] The T−14 balance request never goes out on the event's own day; it still goes out on T−1
- [ ] The T−7 balance reminder never goes out on the event's own day; it still goes out on T−1
- [ ] Both queries floor `event_date` at `today + 1`, agreeing with both predicates
- [ ] `balance-schedule.test.ts` covers event day → false, T−1 → true for both predicates
- [ ] `cron/balance-scheduler.test.ts` covers the event morning (nothing sent, link unchanged) and T−1 (sent)
- [ ] "Saldo por pagar" panel and quote-card badge unchanged
- [ ] CI green

## Queue

- [ ] Pass 1 — predicates + `balance-schedule.test.ts`
- [ ] Pass 2 — query floors in `quotes.ts`
- [ ] Pass 3 — job comment + `cron/balance-scheduler.test.ts` edge cases
- [ ] Pass 4 — push, CI GREEN, flip ready
