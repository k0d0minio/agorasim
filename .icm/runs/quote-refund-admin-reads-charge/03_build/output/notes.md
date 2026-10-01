# Build notes: quote-refund-admin-reads-charge

- commits: ad3c8c0 feat — settle the admin refund from Stripe's cumulative total (code + tests)
- ci: GREEN on 283a61a (draft tier, quality job pass) · GREEN on db1ab90 (full gate, Vercel preview pass)
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

## Release

- gate: Ready to merge ticked — merge authorised
- ci: GREEN on dcb4eba (ci-status.sh, full gate) — re-read after the last push
- reviews: code medium (no findings) · security security-check.sh --branch --audit: BLOCKED 1 → audit waived — next 16.3.4 GHSA-vcvr-r3jv-pc5j (critical, `next/og`, not imported) and undici GHSA-rfgv-xxqx-mfg5 / GHSA-w293-vg96-wgc3 (high, via shadcn and @vercel/blob), pre-existing on main and outside this branch's touches: — "Waive and merge" (Jamie, in session, 2026-10-01); re-read --branch --no-audit: OK · + /security-review — no findings (payments path; authz, owning-account read, no re-issue via the platform retry) · production-readiness n/a — skill not shipped in this repo · readiness env.sh audit --changed: OK
- parked: dependency-advisories-next-undici.md (Build) · refund-webhook-stale-charge-snapshot.md (Define)
- migrations: skip — none of this run's own
- learned: 1 rule appended to _shared/project-rules.md (dependency-audit on a run that did not touch the manifest)
- docs: no docs impact · announce: deferred to promotion
