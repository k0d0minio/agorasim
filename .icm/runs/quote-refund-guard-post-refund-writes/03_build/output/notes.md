# Build notes: quote-refund-guard-post-refund-writes

- commits: 1da2f65 feat — report a refund whose books failed instead of throwing
- ci: <filled at step 12>
- ready: 2026-10-01T10:59:00Z — flipped on 9ac86d3

## What changed

- `web/src/lib/quote-refund.ts`: `QuoteRefundOutcome` gains `refunded-unrecorded` (payment as
  read, `refundedCents`, `refundId`, `cancelEventRequested`). `refundQuotePayment` wraps only the
  `settleInstalmentRefund` call — everything before the Stripe refund is untouched, so a refusal
  stays `refund-failed`. The catch logs one `console.error` and returns; nothing is retried.
- `web/src/app/admin/sales/actions.ts`: `QuoteActionState.warning`; `refundLeadQuotePayment` maps
  the new outcome to `{ ok: true, warning }` in PT-PT, with the cancellation sentence only when
  one was requested. No `revalidatePath` — the cancellation is not confirmed.
- `web/src/components/admin/quote-refund-dialogs.tsx`: `Outcome` renders `warning` in
  `text-destructive` with `role="alert"`, before the muted success message. The dialog already
  closes on `state.ok` and the card refreshes.
- `web/src/lib/quote-refund.test.ts`: the refund write rejecting after a successful refund, with
  and without `cancelEvent` (outcome, log line, no cancellation / audit / notice afterwards), and
  the cancellation itself being the write that rejects.

## Acceptance criteria status

- [x] A post-refund write throwing resolves to `refunded-unrecorded` with amount, refund id,
      payment and cancellation request — the try covers the whole settle step (refund write, fee
      write, cancellation).
- [x] One `console.error`: quote ref, instalment, refund id, amount, cancellation request, the
      error, "the webhook will reconcile".
- [x] Nothing attempted after the catch — asserted by the test.
- [x] Action maps it to `ok` + `warning`; the card renders it red.
- [x] Wording per the spec; cancellation sentence only when requested.
- [x] Every existing outcome and message unchanged (only additive edits to the switch and union).
- [x] Tests added; CI verdict at step 12.

## Notes for Release

- A consequence of D-2 the reviews should see: when the **cancellation** is the write that throws,
  the refund row and its audit row have already landed, so the webhook echo finds the row
  `already-synced` and the couple's notice is never sent. The operator's red warning tells them
  to check the card; the couple are not told by email in that one path. Fixing it needs a retry
  or a reorder — out of this spec (no retry by decision; claim order is `quote-refund-echo-race`).
- Learned rule (quote-refunds): a dialog that closes on `state.ok` stays closed unless keyed. The
  new outcome closes the dialog exactly as `refunded` does, so it inherits whatever keying the
  card already has — no change here.
- **`security-check.sh --branch` is BLOCKED on a pre-existing dependency finding, not on this
  diff**: a critical `next` advisory (16.3.4 pinned; next/og RCE, patched 16.3.6) and three high
  `undici` ones, all on `main`. Parked as `.icm/intake/triage/dependency-audit-next-undici.md`
  per security-audit → Dependency findings (`error.log` has the trace). Release stop class 2
  reads the same audit — the operator decides whether that chore lands on `main` first.
