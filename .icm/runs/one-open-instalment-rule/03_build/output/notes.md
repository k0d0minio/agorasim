# Build notes: one-open-instalment-rule

- commits: feat: one-open-instalment-rule — one shared open-instalment rule in quote-math
- ci: <settled after the ready flip>

## What changed

- `web/src/lib/quote-math.ts`: the one home of the rule — `OPEN_INSTALMENT_STATUSES` (`["pending", "issued"] as const`, checked with `satisfies` against `QuotePayment["status"]`) and `isOpenInstalment` built on it; one `import type` from `@/db`, so the browser quote builder still pulls in no runtime code. Header comment now says "no runtime imports".
- `web/src/lib/quotes.ts`: private `isOpenInstalment` deleted, imported from quote-math; all six `inArray(quotePayments.status, ["pending", "issued"])` read `OPEN_INSTALMENT_STATUSES` (reminder read, unpaid-panel rule, write-off, issue, settle, cancel guards).
- `web/src/lib/balance-schedule.ts`: `isBalanceOpen` deleted; `isBalanceFlagged` calls `isOpenInstalment`.
- `web/src/lib/cron/balance-scheduler.ts`: both filters call `isOpenInstalment` from quote-math.
- `web/src/lib/balance-schedule.test.ts` → `web/src/lib/quote-math.test.ts`: the four `isBalanceOpen` assertions moved, same inputs and expectations, against `isOpenInstalment`.

## Acceptance criteria status

- [x] quote-math exports `OPEN_INSTALMENT_STATUSES` and `isOpenInstalment`; its only import is `import type { QuotePayment } from "@/db"`.
- [x] quotes.ts has no private copy and no literal status list — six `inArray`s read the constant.
- [x] `isBalanceOpen` is gone (grep finds nothing); balance-schedule.ts and the cron import `isOpenInstalment` from quote-math.
- [x] `grep -rn '"pending", "issued"' web/src --include=*.ts --include=*.tsx` finds only test files; one definition of the rule.
- [x] The four assertions live in quote-math.test.ts unchanged.
- [x] No behaviour change — no other test edited; `unpaid-balances.test.ts`'s parameter assertion still sees `"pending", "issued"` because drizzle binds the tuple's values. Proven by CI on the ready head.

## Notes for Release

- The stub said the "Saldo por pagar" panel read `isBalanceOpen`; it never did — it reads SQL. The spec (settled with the operator) widened the run to the SQL status lists for that reason.
- `quote-refund.ts` status lists (refundable / terminal) deliberately untouched.
