# Stub: "Saldo por pagar" puts the nearest events first, whatever piles up in the past

- lane: tweak
- found-by: balance-scheduler / Release code review · 2026-09-25
- complexity: low

## Problem

`listUnpaidBalancesDue` (`web/src/lib/quotes.ts`) has no lower date bound, sorts by event date ascending and stops at 50 rows. Past events whose balance nobody recorded or wrote off stay on the list for good, which is deliberate: nothing auto-releases until the client decides the T−0 rule. Once 50 of them pile up, the upcoming events inside T−3, which are the ones the panel exists for, fall off the end. Unlikely at today's volume, but invisible when it happens.

## Proposed change

Order the upcoming events (`event_date >= today`) first, soonest first, then the past ones, most recent first. Alternatively, read the two sets separately and render the past ones under their own "Eventos passados" line. Keep the rule `isBalanceFlagged` states.
