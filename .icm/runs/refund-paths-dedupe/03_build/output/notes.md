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
- [x] `sendRefundNotice` makes one `getQuote` and no `getPayment`; the email's fields are the same
      values (the instalment now comes from `quote.payments` of the same fresh read).
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
  Release's `--audit` read will need the operator's waiver or that chore merged first.
- Merging `main` met `quote-notice-context-dedupe` (#185) in `sendRefundNotice`: resolved onto its
  `loadQuoteNoticeContext(options.quoteId, …)`, with the instalment check as its `accept` so a
  vanished instalment still returns before the no-lead warning, exactly as before.
- Context budget: the merge conflict needed `loadQuoteNoticeContext` from #185 — read beyond the
  spec's `touches:`.
