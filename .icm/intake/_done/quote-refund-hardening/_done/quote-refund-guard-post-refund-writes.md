# Stub: A database error after a quote refund surfaces as an error page

- feature-slug: quote-refund-guard-post-refund-writes
- scope: quote-refund-hardening
- personas: team, operator
- initiative: contracted feature ⑥ hardening / objective: money already collected on a quote settles correctly under retries, races and stale reads
- priority: P2
- complexity: low
- depends-on: none
- sequence: 2 of 5

## Problem

`refundQuotePayment` (`web/src/lib/quote-refund.ts`) promises never to throw, but the
writes in `settleInstalmentRefund` after Stripe has refunded are unguarded: a Neon error
throws through the server action, the requested cancellation and the notice are skipped,
and the operator sees an error page for money that did move.

## Proposed change

Catch after the refund, log loudly, and return a distinct outcome ("refunded, books not
updated — the webhook will reconcile") so the action tells the operator the truth.

## Acceptance criteria (rough)

- [ ] A database error after `refunds.create` succeeds returns a plain outcome, not an
      error page
- [ ] The outcome is logged loudly and worded so the operator knows the refund happened
      and the books will reconcile via webhook
- [ ] A test forces the post-refund write to fail; CI green

## Out of scope (this feature)

- The echo race between the webhook and the admin claim (stub 3 of this epic) — this stub
  only guards the writes, it doesn't reorder the claim.

## Notes for Define

- `sources:` quote-refunds · Release code review · 2026-09-24 —
  `web/src/lib/quote-refund.ts` (`refundQuotePayment`, `settleInstalmentRefund`).
- `touches:` web/src/lib/quote-refund.ts

## Prompt

In the agorasim repo, read
`.icm/intake/quote-refund-hardening/quote-refund-guard-post-refund-writes.md`. Guard the
post-refund writes in `refundQuotePayment` with an outcome the admin action words plainly,
and test it. `git mv` this stub to `_done/` in the PR, on a `claude/` branch; CI is the
source of truth.
