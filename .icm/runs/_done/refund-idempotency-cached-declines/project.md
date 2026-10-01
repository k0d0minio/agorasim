# Project: refund-idempotency-cached-declines

The run's context card — what a fresh session needs before it reads anything else. Pointers,
not copies: the spec stays the spec, the scope stays the scope. Seeded when the run is opened
(`new-run.sh` → `run-pack.sh --init`), sharpened by whichever stage learns something. Read with
`status.md` and `handoff.md` on every resume (`_shared/stage-preamble.md`).

- stub: intake/quote-refund-hardening/refund-idempotency-cached-declines.md
- scope: none
- spec: 02_define/output/spec.md
- touches: web/src/lib/quote-refund.ts, web/src/lib/quote-refund.test.ts, web/src/lib/booking-refund.ts, web/src/lib/form-schemas.ts, web/src/app/admin/sales/actions.ts, web/src/components/admin/quote-refund-dialogs.tsx
- complexity: standard → model: sonnet (executor — select-model.sh --stage 03_build)

## Constraints

- Only the couple's refund keys change; the fee top-up keys (`booking-fee-refund:`,
  `quote-fee-refund:`) stay as they are.
- No shared refund helper — that is stub 5 (`refund-paths-dedupe`).
- No change to the Sales board's "Cancelar" form or the guest's cancel link (D-1).
- Every admin string comes from `.icm/docs/admin-pt-inventory.md`'s register.

## Context budget

- Define read `booking-refund.ts`, `quote-refund.ts`, `quotes.ts` (`recordPaymentRefund`), the Sales actions and the refund dialog to establish that the tour path is one-shot and that a same-key replay settles idempotently.
