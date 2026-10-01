# Build notes: quote-refund-admin-reads-charge

- commits: ad3c8c0 feat — settle the admin refund from Stripe's cumulative total (code + tests)
- ci: GREEN on 283a61a (draft tier)
- ready: 2026-10-01T10:59:13Z — flipped on 283a61a

## What changed

- `web/src/lib/quote-refund.ts`: `issueInstalmentRefund` reads the charge back after
  `refunds.create` (`readChargeAfterRefund`, on the same owning account) and returns its
  `amount_refunded` as `totalRefundedCents`, plus the post-refund charge for the fee arithmetic
  and audit ids. `refundQuotePayment` settles from that total, falling back to
  `row + refund.amount` with a logged `console.error` when the read failed. The read never
  throws: a throw inside `onOwningAccount`'s callback would either report `refund-failed` for
  money that went back or, on `resource_missing`, re-run the whole callback on the platform.
  The charge id comes from the pre-refund `latest_charge`, else `refund.charge`.
- `web/src/lib/quote-refund.test.ts`: the Stripe stand-in gains `charges.retrieve`, and
  `stripeRefundsAsAsked` counts every refund on the charge (with an optional
  `refundedBefore` for a dashboard refund the row never heard of). Two new cases: the stale
  row (settled total, fee top-up to the proportion of that total, one notice quoting it,
  silent echo) and the failed read-back (still `refunded`, row's sum, logged, one Stripe
  refund). No existing assertion was edited.

## Acceptance criteria status

- [x] Stale row → instalment set to Stripe's cumulative `amount_refunded` — `refundQuotePayment`; test "settles a stale row from Stripe's total…"
- [x] Status and fee top-up follow the settled total — same test (`paid` at 38 400 of 57 600; top-up 1 152 to 2 304)
- [x] One notice with Stripe's total and "refunded now" = total − row's prior figure; echo silent — same test (lead and total line both 384 €; echo `already-synced`, one email)
- [x] `refundedCents` is still this refund — same test (19 200)
- [x] Failed read → `refunded`, row's sum, logged — test "falls back to the row's sum…"
- [x] In-step rows unchanged — no existing assertion edited; the helper now models the charge's running total
- [x] New tests cover both cases; CI green — pending the verdict

## Notes for Release

- `settleInstalmentRefund` and `sendRefundNotice` are untouched: the notice's "refunded now"
  was already `refundedAmountCents − payment.refundedAmountCents`, so D-1 falls out of the
  settled total alone.
- The idempotency key still uses the row's figure (stub 4) and the dialog ceiling is still
  row-based (out of scope; Stripe refuses an over-ceiling refund).
- `security-check.sh --branch` → `BLOCKED 1` on `dependency-audit` only (secrets clean): 1
  critical + 3 high already on main — `next` 16.3.4 (`next/og`, not imported by `web/src`) and
  `undici` via `shadcn` / `@vercel/blob`. Not this branch's (no manifest change, outside
  `touches:`); parked as `intake/triage/dependency-advisories-next-undici.md` (chore, P1).
  The branch gate will keep reporting it until that chore merges.
