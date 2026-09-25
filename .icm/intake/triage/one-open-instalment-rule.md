# Stub: One definition of "an instalment with money still to collect"

- lane: chore
- found-by: balance-scheduler / Release code review · 2026-09-25
- complexity: low

## Problem

`isBalanceOpen` (`web/src/lib/balance-schedule.ts`) is a copy of the private `isOpenInstalment` in `web/src/lib/quotes.ts`: `pending` or `issued`, and more than zero. The quote page (`dueInstalment`) reads one copy, and the scheduler, the Sales panel and the quote-card badge read the other. A new payment status added to one copy would make the page and the panel disagree about whether a balance is open.

## Proposed change

Move the predicate into `web/src/lib/quote-math.ts`, which has no runtime imports and is safe from both modules, with a type-only import of `QuotePayment`. `quotes.ts` and `balance-schedule.ts` then both import it. No behaviour change.
