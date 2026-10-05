# Build notes: refund-paths-dedupe

- commits: feat: refund-paths-dedupe — one Stripe half for both refund paths
- ci: GREEN on 707e61c — full gate (Vercel preview pass, Quality (advisory) pass)
- ready: 2026-10-05T12:29:19Z — flipped on b536198

## What changed

- `web/src/lib/booking-refund.ts`: new exported `refundPaymentIntent({ paymentIntentId,
  amountCents, metadata, idempotencyKey })` → `{ refund, charge, account }` — the
  intent read, the conditional `refund_application_fee` and the keyed `refunds.create`, inside
  one `onOwningAccount`. `issueRefund` computes its claim key first, then calls it. New exported
  `chargeRefundState(charge)` → `{ paymentIntentId, refundedAmountCents, feeTargetCents }`;
  `syncRefundFromStripe` starts from it (`feeTaken` stays local — the audit row needs it).
- `web/src/lib/quote-refund.ts`: `issueInstalmentRefund` calls `refundPaymentIntent`, then
  `readChargeAfterRefund` on the returned account, outside the owning-account retry.
  `syncQuotePaymentRefundFromStripe` starts from `chargeRefundState`. `sendRefundNotice` takes
  `quoteId` and makes one `getQuote`, finding the instalment in `quote.payments`.
- `web/src/app/admin/sales/[id]/page.tsx`: `instalmentRefundableCents` computed once per
  instalment into `refundableCents`; `refundable` reads off it.
- `web/src/components/admin/lead-quote-card.tsx`: payment shape gains `refundableCents`, passed to
  the dialog.
- `web/src/components/admin/quote-refund-dialogs.tsx`: `RefundQuotePaymentDialog` takes
  `refundableCents` as a prop; its local subtraction is gone.

## Acceptance criteria status

- [x] `refundPaymentIntent` holds the only `refunds.create` in `web/src/lib` outside tests —
      grep: `booking-refund.ts` only.
- [x] Both idempotency keys unchanged — same template strings, sent as `{ ...account, idempotencyKey }`.
- [x] `chargeRefundState` backs both sync prologues — neither reads `charge.payment_intent` any more.
- [x] `sendRefundNotice` makes no `getPayment`; the email's fields are the same values (the
      instalment comes from `quote.payments` of the context read). Since the Release merge it
      reads the quote twice: #189 (merged after Build) added a deliberate second read inside the
      message-log claim, kept as is — the "one quote read" count is superseded by that fix.
- [x] The dialog takes `refundableCents` as a prop; the page computes it with
      `instalmentRefundableCents`.
- [x] No behaviour change, the three test files unedited — `git diff origin/main -- '*.test.ts'`
      is empty; Quality (advisory) passed on 707e61c.

## Notes for Release

- One ordering change, by design (plan risk 3): `issueRefund` reads the claim's moment before
  asking Stripe anything, so a row without `cancelledAt` is refused without the intent read it
  used to make first. Same outcome (a failed refund); every caller passes the claimed row.
- `readChargeAfterRefund` moved from inside `onOwningAccount` to after it. It never throws, so the
  retry was already unreachable from it; now that does not rest on its catch.
- Types were not checked locally (the pipeline runs no typecheck in session); `next build` on
  the preview and the advisory job check them.
- `security-check.sh --branch` → `BLOCKED 1` on `dependency-audit`: the `braces` high advisory
  (dev-only, via `eslint-config-next`, no upstream fix) that `main` already carries — this branch
  touches no manifest or lockfile. Parked as `intake/triage/braces-advisory-eslint-chain.md`;
  Release's `--audit` read needed that chore: merged as #194 (the operator's waiver).
- Merging `main` met `quote-notice-context-dedupe` (#185) in `sendRefundNotice`: resolved onto its
  `loadQuoteNoticeContext(options.quoteId, …)`, with the instalment check as its `accept` so a
  vanished instalment still returns before the no-lead warning, exactly as before.
- Context budget: the merge conflict needed `loadQuoteNoticeContext` from #185 — read beyond the
  spec's `touches:`.
- Release merge of `main` met `fix-quote-refund-double-submit-notice-order` (#189) in
  `sendRefundNotice`: resolved onto its email-built-under-the-claim shape, keeping this run's
  `quoteId` + `accept` lookup (no `getPayment`) and #189's in-claim re-read.

## Release

- gate: Ready to merge ticked — merge authorised
- ci: blocking GREEN on the close-out head (ci-status.sh, after the last push — SHA in the stop report) · Quality (advisory) RED on `route.test.ts` — `main`'s since #181 (identical five failures on #181's own head 63d857e), not this diff; parked
- reviews: code medium — no findings · security `security-check.sh --branch --audit`: OK (after #194, the operator's recorded waiver of GHSA-vfj7-8cjw-p6xm) + /security-review — no findings (payments) · /production-readiness — n/a, no such skill in this repo · readiness `env.sh audit --changed`: OK
- parked: braces-advisory-eslint-chain.md (at Build; consumed by chore #194) · webhook-route-test-leaked-charge-mock.md (main's red advisory suite, found at Release) · none from the reviews
- migrations: skip — none of this run's own
- learned: none from retrospective.sh (dependency-audit already a rule); 1 from FAILURE.md via close-out
- docs: no docs impact · announce: deferred to promotion
