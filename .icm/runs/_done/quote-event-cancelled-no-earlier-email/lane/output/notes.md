# Tweak: quote-event-cancelled-no-earlier-email

- change: `quoteEventCancelled` lead (`web/src/content/emails.ts`): always "details in an earlier email" → that sentence only when a sent `quote-refunded` row exists; otherwise new `leadNoEarlierEmail` (PT + EN) states the refund plainly. Chosen in `sendEventCancelledNotice` via new `hasSentQuoteRefundNotice` (`web/src/lib/message-log.ts`).
- changelog: announce: none
- learned: none
