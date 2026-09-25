# Decisions: notifications-page-real

The `D-n` ids this run rests on, mirrored from the scope's Decisions table
(`_shared/scope-template.md` → `D-n` ids are permanent), plus any the run itself had to make.
`validate-decisions.sh <slug>` traces the scope's ids into `spec.md` and `notes.md`; this file
is the run's own ledger, so a session need not open the scope to know what was settled and a
decision made mid-run has one home.

## From the scope

- No scope.md (epic re-cut by `/project`). Register decisions the spec honours: D4 (admin hardcoded Portuguese), D5 (email-first, SMS post-live), D22 (social stays parked), D24 (thank-you soft opt-in — its card line names the Google review link).

## Made in this run

- D-1 — Provider id (`re_…`) is not shown on the page; it expires at 90 days and is not actionable there. Define, Jamie, 2026-09-25.
- D-2 — Recipient shown as the guest's name from the pedido (or "Equipa") plus the reference (`BK-…` / `EN-…`) linked to the pedido in Vendas. Define, Jamie, 2026-09-25.
- D-3 — The log shows every send of the last 30 days, grouped by Lisbon day, no pagination. Define, Jamie, 2026-09-25.
- D-4 — Failed sends and sends `sending` over 1 hour are listed in a "Precisa de atenção" block above the log, hidden when empty. Define, Jamie, 2026-09-25.
- D-5 — No card for `balance-request` / `balance-reminder` until `quote-flow/balance-scheduler` gives them a sender. Define, 2026-09-25.
