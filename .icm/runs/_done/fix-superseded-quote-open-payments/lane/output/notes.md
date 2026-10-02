# Bug: fix-superseded-quote-open-payments

- observed: sending a new quote version cancels the old quote but leaves its deposit/balance instalments `pending`/`issued` with live Checkout sessions, so a stale tab could pay a cancelled quote (webhook only alerts "needs a human") · expected: the old quote's unpaid instalments are written off and their Checkout sessions expired
- cause: `supersedeSentQuotes` (web/src/lib/quotes.ts) cancelled only the `quotes` rows
- fix: quotes.ts: `supersedeSentQuotes` also cancels the old quotes' open instalments and returns them; quote-checkout.ts: `expireWrittenOffSessions` moved here from quote-refund.ts and exported; quote-builder.ts: `sendQuote` expires the returned sessions. Tests in quote-writes/quote-builder updated.
- not done: the stub's "webhook refunds a payment on a cancelled quote" — automated refunds are money movement beyond a bug fix; the race (paid between supersede and expire) still alerts. Left for a decision.
- changelog: announce: none
- learned: none
- ci: Vercel RED (`Resource provisioning failed`, ~1s, no log) — identical on unrelated branches; not this PR's. Parked: `vercel-preview-resource-provisioning-failed`. Quality (advisory) passes.
