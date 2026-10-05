# Bug: fix-quote-refund-double-submit-notice-order

- observed: a double-submitted "Reembolsar e cancelar evento" (both presses read the instalment before either wrote) could send the loser's `quote-event-cancelled` before the winner's `quote-refunded`; the winner then returned the pre-refund quote, so `eventCancelled` read false · expected: the couple hear about the refund first (or in one email that says the event is off), and the winner reports the event cancelled. Reproduced by reading `settleInstalmentRefund` and in the new test; tests are not run locally (CI is the verdict).
- cause: the lost-claim branch sent the cancellation notice unconditionally after its own `cancelEvent`, and the claimed path returned `cancelled ?? quote` with `cancelled` null when the loser had already cancelled.
- fix: web/src/lib/quote-refund.ts: lost-claim notice only when `isRefundNoticeClaimed` (new, web/src/lib/message-log.ts); the refund notice is now built under its claim (`ClaimedMessage`) from a fresh read, so "not claimed" guarantees its text says cancelled; claimed path re-reads the quote when its `cancelEvent` returns null. Test added in quote-refund.test.ts.
- changelog: not user-visible (no changelog in this repo)
- learned: none
- note: with the message log unreachable the refund notice is no longer sent unlogged (a claimed builder needs the claim) — logged by `sendLoggedEmail` as failed.
