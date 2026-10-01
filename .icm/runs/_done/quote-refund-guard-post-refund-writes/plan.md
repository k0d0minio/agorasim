# Plan: quote-refund-guard-post-refund-writes

Build's execution plan in passes — each pass one layer of the change, in the order it lands, so
a session that resumes mid-build sees where it is. Written by the advisor pass (Define, or
Build's first act on `sonnet` after reading the spec), executed pass by pass, and rewritten when
reality disagrees with it — never left describing a plan that was abandoned.

## Passes

1. **The library outcome** — `web/src/lib/quote-refund.ts`: add a `QuoteRefundOutcome` member
   (e.g. `status: "refunded-unrecorded"`, with `payment`, `refundedCents: refund.amount`,
   `refundId: refund.id`, `cancelEventRequested`); wrap the `settleInstalmentRefund(...)` call in
   `refundQuotePayment` (only that call — everything before the Stripe refund stays as is) in a
   try/catch that logs one `console.error` (`[quote-refund] <ref>: refunded <amount> on the
   <kind> (<refund id>) but couldn't write it — the webhook will reconcile; cancellation
   requested: yes/no`, plus the error) and returns the new outcome. No retry, no cancellation in
   the catch. Update the function's doc comment so "never throws" names the new outcome — done
   when: the type checks and the existing tests still pass unchanged.
2. **The test** — `web/src/lib/quote-refund.test.ts`: make the mocked post-refund write
   (`recordPaymentRefund`) reject after a successful `refunds.create`, once with `cancelEvent:
   false` and once with `true`; assert the outcome shape, the `console.error` call, and that
   `cancelQuoteAndOpenInstalments` / the notice were not called — done when: the new cases are
   green beside the old ones.
3. **The Sales action and the card** — `QuoteActionState` gains `warning?: string`;
   `refundLeadQuotePayment` (`web/src/app/admin/sales/actions.ts`) adds the case returning
   `{ ok: true, warning }` in PT-PT (wording in the spec; vocabulary from
   `.icm/docs/admin-pt-inventory.md` — *registo*), with the cancellation sentence only when
   `cancelEventRequested`; `Outcome` in `web/src/components/admin/quote-refund-dialogs.tsx`
   renders `warning` in the destructive style with `role="alert"` — done when: the switch is
   exhaustive (no default needed), the dialog closes on the new state (it already closes on
   `state.ok`), and the other refund/cancel dialogs sharing `Outcome` are unaffected.

## Risks

- Stub 1 (`quote-refund-admin-reads-charge`) and stub 3 (`quote-refund-echo-race`) edit the same
  function; whichever merges second rebases over the other. Signal: a conflict around the
  `settleInstalmentRefund` call in `refundQuotePayment`.
- Wrapping too much — a try that also covers `issueInstalmentRefund` would turn a Stripe refusal
  into "refunded". Signal: the existing `refund-failed` tests change outcome.
- `QuoteActionState` is shared by every Sales action; `warning` must be optional and ignored by
  the other renderers.
