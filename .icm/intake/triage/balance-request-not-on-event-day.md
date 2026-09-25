# Stub: No balance request on the morning of the event itself

- lane: tweak
- found-by: balance-scheduler / Release code review · 2026-09-25
- complexity: low

## Problem

`isRequestInWindow` (`web/src/lib/balance-schedule.ts`) and the floor on `listQuotesDueForBalance` (`web/src/lib/quotes.ts`) let the T−14 request go out on the day of the event itself. That happens when a deposit is paid, or written off by transfer, the evening before. The 06:00 run then emails "your event is getting close — the balance is paid now" on the wedding morning, and rotating the quote link retires every link the couple already had. The approved spec says only "not past", so the event day counts as in the window. Changing that is a behaviour decision, not a Release fix.

## Proposed change

Stop the request at T−1: `daysBetween(today, eventDate) >= 1`, with the query floor moved to `today + 1`. An event-day balance is then the team's alone, on the "Saldo por pagar" panel it already appears on. Update `balance-schedule.test.ts` and `cron/balance-scheduler.test.ts` for the new edge.
