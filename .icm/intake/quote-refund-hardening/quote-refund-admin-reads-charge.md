# Stub: The admin quote refund adds to the row instead of reading Stripe's cumulative total

- feature-slug: quote-refund-admin-reads-charge
- scope: quote-refund-hardening
- personas: team, operator
- initiative: contracted feature ⑥ hardening / objective: money already collected on a quote settles correctly under retries, races and stale reads
- priority: P2
- complexity: low
- depends-on: none
- sequence: 1 of 5

## Problem

`refundQuotePayment` (`web/src/lib/quote-refund.ts`) sets the instalment to
`payment.refundedAmountCents + refund.amount`. If an earlier dashboard refund's webhook
was missed, the row and the ceiling are stale, the notice is keyed and worded on the wrong
total, and the later echo sends a second notice for the gap.

## Proposed change

After `refunds.create`, re-read the charge on the owning account and settle from its
`amount_refunded` (falling back to the sum only when the read fails).

## Acceptance criteria (rough)

- [ ] A refund issued while the row is stale (an earlier webhook missed) settles the
      instalment from Stripe's own cumulative total, not the stale sum
- [ ] The notice quotes the settled total; no second notice fires for a gap Stripe's own
      number already closes
- [ ] A test covers the stale-row case; CI green

## Out of scope (this feature)

- The idempotency-key rework (stub 4 of this epic) — this stub only changes what the
  settled amount is read from.

## Notes for Define

- `sources:` quote-refunds · Release code review · 2026-09-24 —
  `web/src/lib/quote-refund.ts` (`refundQuotePayment`).
- `touches:` web/src/lib/quote-refund.ts

## Prompt

In the agorasim repo, read
`.icm/intake/quote-refund-hardening/quote-refund-admin-reads-charge.md` and the epic's
breakdown. Settle the admin refund from the charge's cumulative `amount_refunded`, with a
test for a stale row. `git mv` this stub to `_done/` in the PR, on a `claude/` branch; CI is
the source of truth.
