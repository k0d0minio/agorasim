# Bug: fix-quote-refund-echo-attribution

- observed: `refundBehind` read only the charge's newest refund for a `charge.refunded` event, so with two refunds close together an admin refund's echo went undeferred when a dashboard refund landed after it (the echo then won the compare-and-set and recorded the admin refund as Stripe's, no actor) · expected: the deferral considers every refund the row has not recorded
- cause: attribution by "latest refund" instead of by the money the row is missing
- fix: web/src/lib/quote-refund.ts: `refundBehind` → `unrecordedRefunds` walks the charge's refunds newest-first until `amount_refunded - row.refundedAmountCents` is covered (stops at the refund the row already carries, skips failed/canceled); defer if any is an unsettled quote-card refund inside the window. web/src/lib/quote-refund.test.ts: both interleavings plus the already-recorded case.
- changelog: announce: none
- learned: none
- ready: 2026-10-02 — PR flipped ready, full gate and previews on this head
