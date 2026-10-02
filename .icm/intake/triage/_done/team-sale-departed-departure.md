# Stub: The team cannot sell or move onto today's departure once it has left

- lane: bug
- found-by: open-by-default release review · 2026-10-01
- complexity: medium

## Problem

`describeSlot` (`web/src/lib/availability.ts`) treats a departure as past only when its *day*
is before today (`date < today`). Guests never reach today (two days' notice), but the team
audience sells today — and since open-by-default every untouched departure is open. So at
15:00 on an ordinary day, the Calendar day sheet's "Nova reserva", the Sales board's manual
booking picker and the move picker all offer today's 10:00 departure, and
`createManualBooking` / `moveBookingToDeparture` accept it: a guest can be moved onto a tour
that left five hours ago. Before open-by-default this needed the team to have opened today on
purpose. The admin month's "ainda é possível vender" count also includes departed slots.

## Proposed change

A departure of today counts as past once its departure time (10:00 / 14:00 in Europe/Lisbon,
`web/src/content/logistics.ts`) has gone by — for the team audience too. Decide with Jamie
whether a short grace window applies (Rita booking a guest who is standing at the meeting
point). Unit tests in `availability.test.ts` at 09:59 and 10:01 Lisbon time, summer and winter.

## Prompt

In the agorasim repo, read `.icm/intake/triage/team-sale-departed-departure.md`. Run it through
`/pipeline bug team-sale-departed-departure`: settle the grace question with the operator
first, then make `describeSlot` treat a departed slot of today as past for both audiences, with
tests at the departure time in Lisbon summer and winter time; `git mv` the stub to `_done/` in
the PR, on a `claude/` branch; CI is the source of truth.
