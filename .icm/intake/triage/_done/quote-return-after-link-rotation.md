# Stub: A couple who pays while a balance email changes their link sees their receipt, not a dead link

- lane: bug
- found-by: build of wedding-quotes/balance-payable-from-deposit · 2026-10-28
- complexity: medium
- priority: P2

## Problem

The embedded Checkout session returns the couple to the quote page with the token in the URL (`return_url` in `web/src/lib/quote-checkout.ts`). Each balance email mints a new token and retires the old one (`buildBalanceEmail` in `web/src/lib/balance-request.ts`). A couple who pays while the daily job or the team sends a balance email may come back to "Este link já não é válido". The webhook still records the payment. The balance is now payable from the deposit on, and the T-15 request now includes `issued` balances, so the window may occur more often than before.

## Proposed change

Investigate. One option: resolve the quote from the Checkout `session_id` on return when the token is dead, and show the receipt state.

## Acceptance criteria

- [ ] A couple who pays, then returns with a token that a later balance email retired, sees the paid state of their quote, not the invalid-link panel.
- [ ] A dead token without a matching complete `session_id` still gets the invalid-link panel with a 404.
