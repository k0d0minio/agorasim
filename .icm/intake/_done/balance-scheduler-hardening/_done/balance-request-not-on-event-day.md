# Stub: No balance request on the morning of the event itself

- feature-slug: balance-request-not-on-event-day
- scope: balance-scheduler-hardening
- personas: team, guest
- initiative: contracted feature ⑥ hardening / objective: the T−14 balance scheduler and the Sales board's unpaid-balances read agree on what is still open and when
- priority: P1
- complexity: low
- depends-on: none
- sequence: 1 of 3

## Problem

`isRequestInWindow` (`web/src/lib/balance-schedule.ts`) and the floor on
`listQuotesDueForBalance` (`web/src/lib/quotes.ts`) let the T−14 request go out on the day
of the event itself. That happens when a deposit is paid, or written off by transfer, the
evening before. The 06:00 run then emails "your event is getting close — the balance is
paid now" on the wedding morning, and rotating the quote link retires every link the
couple already had. The approved spec says only "not past", so the event day counts as in
the window. Changing that is a behaviour decision, not a Release fix.

## Proposed change

Stop the request at T−1: `daysBetween(today, eventDate) >= 1`, with the query floor moved
to `today + 1`. An event-day balance is then the team's alone, on the "Saldo por pagar"
panel it already appears on. Update `balance-schedule.test.ts` and
`cron/balance-scheduler.test.ts` for the new edge.

## Acceptance criteria (rough)

- [ ] The T−14 balance request never fires on the event's own day
- [ ] `listQuotesDueForBalance`'s floor agrees with `isRequestInWindow`'s new edge
- [ ] `balance-schedule.test.ts` and `cron/balance-scheduler.test.ts` cover the T−1 edge; CI
      green

## Out of scope (this feature)

- Any automated event-day rule — the event-day balance stays the team's, worked from the
  panel (stub 2 of this epic).

## Notes for Define

- `sources:` balance-scheduler / Release code review · 2026-09-25 —
  `web/src/lib/balance-schedule.ts` (`isRequestInWindow`), `web/src/lib/quotes.ts`
  (`listQuotesDueForBalance`).
- `touches:` web/src/lib/balance-schedule.ts, web/src/lib/quotes.ts

## Prompt

In the agorasim repo, read
`.icm/intake/balance-scheduler-hardening/balance-request-not-on-event-day.md`. Stop the
T−14 request at T−1 as described, updating both test files for the new edge. `git mv` this
stub to `_done/` in the PR, on a `claude/` branch; CI is the source of truth.
