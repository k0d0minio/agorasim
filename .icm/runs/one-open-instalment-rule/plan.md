# Plan: one-open-instalment-rule

Build's execution plan in passes — each pass one layer of the change, in the order it lands, so
a session that resumes mid-build sees where it is. Written by the advisor pass (Define, or
Build's first act on `sonnet` after reading the spec), executed pass by pass, and rewritten when
reality disagrees with it — never left describing a plan that was abandoned.

## Passes

1. **The one definition** — `web/src/lib/quote-math.ts`: add `OPEN_INSTALMENT_STATUSES`
   (`as const`, typed against `QuotePayment["status"]` via `import type { QuotePayment } from "@/db"`)
   and `isOpenInstalment(payment: Pick<QuotePayment, "status" | "amountCents">)` built on it; move
   the four `isBalanceOpen` assertions from `balance-schedule.test.ts` into `quote-math.test.ts`
   against `isOpenInstalment` — done when: quote-math has no runtime import and the moved test
   reads the same inputs and expectations.
2. **The callers** — `web/src/lib/quotes.ts`: delete the private `isOpenInstalment`, import it and
   `OPEN_INSTALMENT_STATUSES` from `@/lib/quote-math`, and replace every
   `inArray(quotePayments.status, ["pending", "issued"])` (six today: balance-request read,
   reminder read, unpaid-panel `open` rule, write-off, issue, settle, cancel guards — grep, don't
   count from memory); `web/src/lib/balance-schedule.ts`: delete `isBalanceOpen`, `isBalanceFlagged`
   calls `isOpenInstalment`; `web/src/lib/cron/balance-scheduler.ts`: import `isOpenInstalment`
   from `@/lib/quote-math` instead of `isBalanceOpen` — done when:
   `grep -rn 'isBalanceOpen\|"pending", "issued"' web/src --include=*.ts --include=*.tsx`
   finds only test files.
3. **Prove it** — `.icm/scripts/lint.sh`, push, `ci-status.sh` GREEN — done when: every existing
   test passes unchanged (notably `unpaid-balances.test.ts`'s SQL-parameter assertion, which still
   sees `"pending", "issued"` because drizzle binds the constant's values).

## Risks

- `inArray` wants a mutable array type: a `readonly` tuple may fail typecheck — spread it
  (`[...OPEN_INSTALMENT_STATUSES]`) or type the export as `QuotePayment["status"][]`; signal: CI
  typecheck red on `quotes.ts`.
- A quote-math runtime import would break the browser quote builder that imports it; signal:
  anything but `import type` at the top of `quote-math.ts`.
