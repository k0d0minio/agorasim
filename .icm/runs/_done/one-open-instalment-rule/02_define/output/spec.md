# Spec: One definition of "an instalment with money still to collect"

- slug: one-open-instalment-rule
- personas: team
- touches: web/src/lib/quote-math.ts, web/src/lib/quotes.ts, web/src/lib/balance-schedule.ts, web/src/lib/cron/balance-scheduler.ts, web/src/lib/quote-math.test.ts, web/src/lib/balance-schedule.test.ts
- complexity: trivial

## Problem

Contracted feature ⑥ hardening — the T−14 balance scheduler and the Sales board's
unpaid-balances read must agree on what is still open. Today "an instalment with money still
to collect" is written out in three places that nothing ties together: the private
`isOpenInstalment` in `web/src/lib/quotes.ts` (the quote page's `dueInstalment`), its copy
`isBalanceOpen` in `web/src/lib/balance-schedule.ts` (the scheduler and the quote-card's
`isBalanceFlagged`), and the SQL reads and write guards in `quotes.ts`, which repeat the status
list `["pending", "issued"]` as a literal — six times, including the "Saldo por pagar" panel's
own eligibility rule (`listUnpaidBalancesDue`), which never calls either JS copy. A payment
status added to one of them would make the couple's page, the scheduler and the Sales panel
disagree about whether a balance is open.

## Proposed change

`web/src/lib/quote-math.ts` (no runtime imports, safe from both server modules) becomes the one
home of the rule:

- `OPEN_INSTALMENT_STATUSES` — the payment statuses that still have money to collect
  (`pending`, `issued`), typed against `QuotePayment["status"]` with a type-only import.
- `isOpenInstalment(payment)` — open status, and for more than zero cents; written in terms of
  `OPEN_INSTALMENT_STATUSES`.

`quotes.ts` drops its private copy and imports `isOpenInstalment`; every
`inArray(quotePayments.status, ["pending", "issued"])` in it uses `OPEN_INSTALMENT_STATUSES`
instead (the balance request, reminder and unpaid-panel reads, and the write-off, issue,
settle and cancel guards). `balance-schedule.ts` drops `isBalanceOpen`; its own caller
(`isBalanceFlagged`) and `cron/balance-scheduler.ts` call `isOpenInstalment` from
`quote-math.ts`. One name for one rule — no alias is kept. No behaviour change anywhere: the
same rows are read, written and shown.

## Acceptance criteria

- [ ] `web/src/lib/quote-math.ts` exports `OPEN_INSTALMENT_STATUSES` and `isOpenInstalment`, and still has no runtime imports (a type-only import of `QuotePayment` at most)
- [ ] `quotes.ts` has no private `isOpenInstalment`, and no literal `["pending", "issued"]` status list remains in it — every such `inArray` reads `OPEN_INSTALMENT_STATUSES`
- [ ] `isBalanceOpen` no longer exists; `balance-schedule.ts` and `cron/balance-scheduler.ts` call `isOpenInstalment` from `quote-math.ts`
- [ ] A repo-wide search finds exactly one definition of the open-instalment rule (the one in `quote-math.ts`) and no other source file with the literal pair `"pending", "issued"` as a status list outside tests
- [ ] The `isBalanceOpen` unit test's four assertions move to `quote-math.test.ts` against `isOpenInstalment`, unchanged in their inputs and expected results
- [ ] No behaviour change — every other existing test (quote page, scheduler, unpaid-balances panel, quote card, refunds) passes unchanged, including the SQL-parameter assertion in `unpaid-balances.test.ts`

## Out of scope

- The two behaviour fixes earlier in this epic (shipped as the T−1 request cutoff and the panel's split read); this run only unifies the rule they read.
- Any change to which statuses count as open, or to the `amountCents > 0` condition.
- Other status lists that mean something else (e.g. the refundable or terminal payment statuses in `quote-refund.ts`).

## Open questions

- none

Context budget: within the Inputs table, plus targeted greps of `quotes.ts` for the SQL copies the stub did not list (settled with the operator in session: the shared status list covers the SQL reads and the four write guards too).
