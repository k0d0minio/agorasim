# Chore: quote-notice-context-dedupe

- invariant: both couple's quote notices render and log exactly as before; only the duplicated code is shared.
- change: web/src/lib/quote-refund.ts: `loadQuoteNoticeContext` (quote, lead, locale, money, total refunded) and `warnIfUnsent` replace the copies in `sendRefundNotice` / `sendEventCancelledNotice`. web/src/lib/booking-emails.ts: `quoteNoticeFrame` is the shared text + HTML frame for `guestQuoteRefundEmail` / `guestQuoteEventCancelledEmail`.
- rollback: revert the PR; no data or schema involved.
- learned: none
