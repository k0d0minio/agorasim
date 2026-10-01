# Project: quote-refund-guard-post-refund-writes

The run's context card — what a fresh session needs before it reads anything else. Pointers,
not copies: the spec stays the spec, the scope stays the scope. Seeded when the run is opened
(`new-run.sh` → `run-pack.sh --init`), sharpened by whichever stage learns something. Read with
`status.md` and `handoff.md` on every resume (`_shared/stage-preamble.md`).

- stub: intake/quote-refund-hardening/quote-refund-guard-post-refund-writes.md
- scope: none
- spec: 02_define/output/spec.md
- touches: web/src/lib/quote-refund.ts, web/src/lib/quote-refund.test.ts, web/src/app/admin/sales/actions.ts, web/src/components/admin/quote-refund-dialogs.tsx
- complexity: trivial → model: sonnet (executor — select-model.sh --stage 03_build)

## Constraints

- Only the writes after a successful Stripe refund are guarded; every pre-refund outcome and its
  message is unchanged.
- No retry and no second cancellation attempt in the catch (D-2); the webhook reconciles amounts,
  commission, audit row and notice.
- The admin sees the case as a closed dialog with a red warning, never an open dialog (D-1).
- Stubs 1, 3, 4 and 5 of `quote-refund-hardening` own the claim order, the running total, the
  idempotency key and the shared skeleton — out of bounds here.

## Context budget

- Define read `web/src/lib/quote-refund.ts`, the `refundLeadQuotePayment` action and the refund
  dialog's `Outcome` renderer to pin the exact behaviour and the dialog's close-on-ok rule.
