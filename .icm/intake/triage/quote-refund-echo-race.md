# Stub: An admin quote refund can lose its actor and its "event cancelled" notice to the webhook echo

- lane: bug
- found-by: quote-refunds · Release code review · 2026-09-24
- complexity: medium

## Problem

In `web/src/lib/quote-refund.ts`, if Stripe's `charge.refunded` for an admin refund is processed
before the admin path's `recordPaymentRefund`, the webhook wins the compare-and-set: the audit row
says `via: stripe` with no actor, the couple's `quote-refunded` notice goes out with
`eventCancelled: false`, and the admin path then cancels the event (its `claimed: false` branch) —
so the couple are never told it is off, and the action returns the pre-refund row.

## Proposed change

Make the admin path claim first (e.g. write the refund intent before calling Stripe, or have the
webhook skip rows whose refund carries `metadata.via = admin` for a short window), and send a
second notice when a cancellation follows a notice that said "still booked".

## Prompt

In the agorasim repo, read `.icm/intake/triage/quote-refund-echo-race.md` and
`web/src/lib/quote-refund.ts` (`settleInstalmentRefund`, the `claimed: false` branch). Fix the
race so the admin refund keeps its actor and the couple's notice matches the event's final state;
add a test that runs the echo before the admin settle. PR on a `claude/` branch; CI is the source
of truth.
