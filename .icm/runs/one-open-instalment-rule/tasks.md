# Tasks: one-open-instalment-rule

The queue, with a definition of done per item. Ticked by the stage that finishes the item —
a human checkbox, never a script's. The definition of done is seeded from the spec's
acceptance criteria when the run is opened; the queue is Build's own, one line per commit-sized
step, so a resuming session can pick up the first unticked line.

## Definition of done

- [ ] `web/src/lib/quote-math.ts` exports `OPEN_INSTALMENT_STATUSES` and `isOpenInstalment`, and still has no runtime imports (a type-only import of `QuotePayment` at most)
- [ ] `quotes.ts` has no private `isOpenInstalment`, and no literal `["pending", "issued"]` status list remains in it — every such `inArray` reads `OPEN_INSTALMENT_STATUSES`
- [ ] `isBalanceOpen` no longer exists; `balance-schedule.ts` and `cron/balance-scheduler.ts` call `isOpenInstalment` from `quote-math.ts`
- [ ] A repo-wide search finds exactly one definition of the open-instalment rule (the one in `quote-math.ts`) and no other source file with the literal pair `"pending", "issued"` as a status list outside tests
- [ ] The `isBalanceOpen` unit test's four assertions move to `quote-math.test.ts` against `isOpenInstalment`, unchanged in their inputs and expected results
- [ ] No behaviour change — every other existing test (quote page, scheduler, unpaid-balances panel, quote card, refunds) passes unchanged, including the SQL-parameter assertion in `unpaid-balances.test.ts`

## Queue

- [ ] <task — small enough for one commit; name the file or area>
