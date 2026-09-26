# Stub: Refund idempotency keys replay a cached Stripe decline on "try again"

- feature-slug: refund-idempotency-cached-declines
- scope: quote-refund-hardening
- personas: team, operator
- initiative: contracted feature ⑥ hardening / objective: money already collected on a quote settles correctly under retries, races and stale reads
- priority: P2
- complexity: medium
- depends-on: none
- sequence: 4 of 5

## Problem

Both refund paths key `refunds.create` on (row, refunded so far, amount) —
`booking-refund:` in `web/src/lib/booking-refund.ts` and `quote-refund:` in
`web/src/lib/quote-refund.ts`. Stripe caches a declined request (e.g.
`balance_insufficient`) against the key for 24h, so the admin's advised retry returns the
same error, and a refund re-issued after an earlier one failed can return the old failed
refund.

## Proposed change

Investigate: add a per-attempt nonce carried by the form (so a double submit still
collapses) or key on the submission, and treat a returned `failed` refund as a reason to
retry with a new key.

## Acceptance criteria (rough)

- [ ] A double submit of the same refund action still collapses to one Stripe call
- [ ] A deliberate retry after a declined or failed refund reaches Stripe with a fresh key
      instead of replaying the cached decline
- [ ] Tests on both the tour and the quote refund path; CI green

## Out of scope (this feature)

- Deduplicating the two paths' Stripe plumbing (stub 5 of this epic) — this stub only
  changes what the idempotency key is derived from.

## Notes for Define

- `sources:` quote-refunds · Release code review · 2026-09-24 —
  `web/src/lib/booking-refund.ts`, `web/src/lib/quote-refund.ts`.
- `touches:` web/src/lib/booking-refund.ts, web/src/lib/quote-refund.ts

## Prompt

In the agorasim repo, read
`.icm/intake/quote-refund-hardening/refund-idempotency-cached-declines.md`. Rework the
refund idempotency keys for tours and quote instalments so a double submit collapses but a
deliberate retry reaches Stripe; tests on both paths. `git mv` this stub to `_done/` in the
PR, on a `claude/` branch; CI is the source of truth.
