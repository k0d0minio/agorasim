# Stub: A lost-claim cancellation can send "Evento cancelado" before the winner's refund notice

- lane: bug
- found-by: quote-refund-echo-race (Release code review) · 2026-10-01
- complexity: medium
- priority: P2

## Problem

In `web/src/lib/quote-refund.ts`, `settleInstalmentRefund`'s lost-claim branch sends
`quote-event-cancelled` as soon as its own `cancelEvent` succeeds. When the winner is still
running — a double-submitted "Reembolsar e cancelar evento" (both calls get the same idempotent
refund), or an echo that was not deferred because `refundBehind` could not read the refund — the
couple can get "Evento cancelado … details in an earlier email" before the refund notice, then a
`quote-refunded` that also says cancelled. The winner's own `cancelEvent` then returns null and
it returns `cancelled ?? quote` (the pre-refund quote), so `eventCancelled` reads false and the
public calendar is not revalidated on that response.

## Proposed change

Send the lost-claim notice only when the couple's `quote-refunded` notice for this refunded
total has already been claimed in `message_log` (it said "held"); otherwise the winner's notice
reads the fresh state and says cancelled. Have the claimed path return the fresh quote when its
own `cancelEvent` returns null.

## Prompt

In the agorasim repo, read `.icm/intake/triage/quote-refund-double-submit-notice-order.md` and
`web/src/lib/quote-refund.ts` (`settleInstalmentRefund`). Make the lost-claim branch's
`quote-event-cancelled` conditional on the winner's `quote-refunded` claim already existing,
and return the fresh quote from the claimed path; add a test for the double submit. `git mv`
this stub to `_done/` in the PR, on a `claude/` branch; CI is the source of truth.
