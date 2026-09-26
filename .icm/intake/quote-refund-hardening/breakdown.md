# Breakdown: Quote refund hardening — the review findings against quote-refund.ts

- scope-slug: quote-refund-hardening · story: none — cut from triage/ by triage batch quote-refunds
- initiative: contracted feature ⑥ hardening / objective: money already collected on a quote settles correctly under retries, races and stale reads
- personas: team, operator

## What I understood

Five findings landed against the quote-refund path from the same review pass
(`quote-refunds` · Release code review · 2026-09-24): the admin refund keys off its own
running total instead of Stripe's, a database error after the refund throws to an error
page instead of a plain outcome, a webhook echo can outrun the admin claim and leave the
couple told the wrong thing about their event, the idempotency key replays a cached Stripe
decline on a deliberate retry, and the quote and tour refund paths have drifted into
near-duplicate Stripe plumbing. Four of the five touch `quote-refund.ts` directly and the
fifth shares it with `booking-refund.ts` — a lane-at-a-time PR order would have each stub
rebase over the last, so this is one epic on one file surface, sequenced.

## Where it sits

Money — the quote/instalment refund path: the admin dashboard refund action →
`quote-refund.ts` → Stripe → the `charge.refunded` / `refund.updated` webhook branch →
`quote_payments` → the couple's notice.

## Build order

1. quote-refund-admin-reads-charge — settle the admin refund from Stripe's cumulative `amount_refunded`, not the row's running total — depends-on: none
2. quote-refund-guard-post-refund-writes — catch the writes after a Stripe refund so a database error reports "refunded, books not updated" instead of an error page — depends-on: none
3. quote-refund-echo-race — make the admin refund claim first so the couple's notice and the event's final state always agree, whichever side the webhook echo reaches first — depends-on: none
4. refund-idempotency-cached-declines — key the refund idempotency on the attempt, not the row, so a deliberate retry reaches Stripe instead of replaying a cached decline — depends-on: none
5. refund-paths-dedupe — extract the shared Stripe-refund skeleton last, once the four fixes above have settled its final shape — depends-on: none

## Out of scope (whole scope)

- The tour-booking refund path's own correctness — this batch only touches
  `booking-refund.ts` where `refund-paths-dedupe` shares code with the quote side.
- The cancellation rule itself (D9 default; `[LAWYER]` open) — unchanged by this batch.
