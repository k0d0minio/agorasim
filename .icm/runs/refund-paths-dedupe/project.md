# Project: refund-paths-dedupe

The run's context card — what a fresh session needs before it reads anything else. Pointers,
not copies: the spec stays the spec, the scope stays the scope. Seeded when the run is opened
(`new-run.sh` → `run-pack.sh --init`), sharpened by whichever stage learns something. Read with
`status.md` and `handoff.md` on every resume (`_shared/stage-preamble.md`).

- stub: intake/quote-refund-hardening/refund-paths-dedupe.md
- scope: none — epic cut by `triage batch` from the `quote-refunds` Release review (2026-09-24)
- spec: 02_define/output/spec.md
- touches: web/src/lib/booking-refund.ts, web/src/lib/quote-refund.ts, web/src/components/admin/quote-refund-dialogs.tsx, web/src/components/admin/lead-quote-card.tsx, web/src/app/admin/sales/[id]/page.tsx
- complexity: standard → model: sonnet (executor — select-model.sh --stage 03_build)

## Constraints

- No behaviour change: `booking-refund.test.ts`, `quote-refund.test.ts` and `quotes.test.ts`
  pass with no edit to them.
- Idempotency keys stay byte-identical (`booking-refund:<id>:<claimedAt>`,
  `quote-refund:<id>:<attemptId>`) — #169's fix depends on them.
- Shared helpers live in `booking-refund.ts` (operator's choice at Define), beside the three
  already shared from there; no new module.
- The sync functions share only their prologue; the deferral window and settle stay per path.

## Context budget

- Read `quote-refund.ts`, `booking-refund.ts`, the dialog, the lead quote card, the sales page
  and the two test files' mock blocks to settle the spec (beyond Define's Inputs: confirms the
  helper can live in `booking-refund.ts` without touching test mocks).
