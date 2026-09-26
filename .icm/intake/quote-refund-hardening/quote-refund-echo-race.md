# Stub: An admin quote refund can lose its actor and its "event cancelled" notice to the webhook echo

- feature-slug: quote-refund-echo-race
- scope: quote-refund-hardening
- personas: team, operator, guest
- initiative: contracted feature ⑥ hardening / objective: money already collected on a quote settles correctly under retries, races and stale reads
- priority: P1
- complexity: medium
- depends-on: none
- sequence: 3 of 5

## Problem

In `web/src/lib/quote-refund.ts`, if Stripe's `charge.refunded` for an admin refund is
processed before the admin path's `recordPaymentRefund`, the webhook wins the
compare-and-set: the audit row says `via: stripe` with no actor, the couple's
`quote-refunded` notice goes out with `eventCancelled: false`, and the admin path then
cancels the event (its `claimed: false` branch) — so the couple are never told it is off,
and the action returns the pre-refund row.

## Proposed change

Make the admin path claim first (e.g. write the refund intent before calling Stripe, or
have the webhook skip rows whose refund carries `metadata.via = admin` for a short
window), and send a second notice when a cancellation follows a notice that said "still
booked".

## Acceptance criteria (rough)

- [ ] An admin refund whose webhook echo lands first still records the admin as actor
- [ ] The couple always receive a notice matching the event's final state (cancelled if
      the admin path cancels it), even when the webhook echo raced ahead
- [ ] A test runs the echo before the admin settle and asserts both outcomes; CI green

## Out of scope (this feature)

- The stale-total read (stub 1 of this epic) and the post-refund write guard (stub 2) —
  this stub is about claim ordering and notice correctness only.

## Notes for Define

- `sources:` quote-refunds · Release code review · 2026-09-24 —
  `web/src/lib/quote-refund.ts` (`settleInstalmentRefund`, the `claimed: false` branch).
- `touches:` web/src/lib/quote-refund.ts

## Prompt

In the agorasim repo, read `.icm/intake/quote-refund-hardening/quote-refund-echo-race.md`
and `web/src/lib/quote-refund.ts` (`settleInstalmentRefund`, the `claimed: false` branch).
Fix the race so the admin refund keeps its actor and the couple's notice matches the
event's final state; add a test that runs the echo before the admin settle. `git mv` this
stub to `_done/` in the PR, on a `claude/` branch; CI is the source of truth.
