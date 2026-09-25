# Stub: A booking moved back to a date it already departed-from keeps the old date's reminder claim

- lane: bug
- found-by: /code-review on message-log-move-safe (PR #110) · 2026-09-18
- priority: P3

## Problem

`message_log` keys the date-bound kinds on the departure they are about
(`web/src/lib/message-log.ts` → `DATE_BOUND_KINDS`, `web/src/db/schema.ts`
→ `message_log_booking_date_kind_key`). The move notice uses the date it moved *to*
(`web/src/lib/booking-move.ts:355`), which is right for a booking moved onward but wrong
for one that comes back.

Three moves are needed: `X → A` claims `(booking-moved, guest, A)`, `A → B` claims B, and
`B → A` finds A's key taken, so no notice goes out. The accepted trade-off recorded in the
doc comment at `booking-move.ts:310` covers exactly that much.

What it does not cover is the compounding case the review found. If A is *tomorrow*, the
`day-before-reminder` for A has already been sent and holds its own key, so the return to A
suppresses the reminder as well. Both moves then have to happen on the eve of departure —
which is precisely when the client decides weather moves (info PDF §1.4). The guest's last
word is date B and they miss a tour departing on A. That is a wrong-date outcome, not the
missing-duplicate one the doc comment accepted.

## Proposed change

Key `booking-moved` on the pair rather than the destination — `<from>→<to>` in
`subject_date`'s place, or a move counter on `bookings` that the claim reads — so every
real move is a distinct message and a return is not mistaken for a repeat. The
`day-before-reminder` half then needs its own answer: either the move retires that
booking's reminder claim for the date it is leaving, or the reminder's key gains the same
counter. Decide the two together; they are one rule.

## Prompt

In the agorasim repo (`web/`), read `.icm/intake/triage/move-back-suppresses-reminder.md`.
Make a booking that is moved back onto a date it has already been moved to earn both its
move notice and, when the reminder for that date has already gone out, a fresh reminder —
without letting a retried move send a second copy. Tests for the three-move sequence and
for the eve-of-departure flip-flop. `git mv` the stub to `_done/` in the PR, on a `claude/`
branch; CI is the source of truth.
