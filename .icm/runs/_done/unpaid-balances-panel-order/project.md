# Project: unpaid-balances-panel-order

The run's context card — what a fresh session needs before it reads anything else. Pointers,
not copies: the spec stays the spec, the scope stays the scope. Seeded when the run is opened
(`new-run.sh` → `run-pack.sh --init`), sharpened by whichever stage learns something. Read with
`status.md` and `handoff.md` on every resume (`_shared/stage-preamble.md`).

- stub: intake/balance-scheduler-hardening/unpaid-balances-panel-order.md
- scope: none
- spec: 02_define/output/spec.md
- touches: web/src/lib/quotes.ts, web/src/lib/quotes.test.ts, web/src/components/admin/unpaid-balances-panel.tsx, web/src/app/admin/sales/page.tsx
- complexity: standard → model: sonnet (executor — select-model.sh --stage 03_build)

## Constraints

- The eligibility predicate does not change — deposit-paid quote, `balance` instalment
  `pending`/`issued`, `amount_cents > 0`, event on or before today + 3 — the rule
  `isBalanceFlagged` states; only the date split, ordering and caps change.
- No T−0 auto-release; no change to the lead quote-card badge; the shared "instalment still
  open" predicate is `one-open-instalment-rule`'s, not this run's.
- Admin vocabulary from `.icm/docs/admin-pt-inventory.md` (Evento).
- Never run build / lint / typecheck / test locally beyond `.icm/scripts/lint.sh`; CI is the
  source of truth.

## Context budget

- Within budget: the stub, `quotes.ts` (the one function), the panel component, the Sales
  page's caller lines, and a grep of the test convention.
