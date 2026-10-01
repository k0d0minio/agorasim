# Decisions: unpaid-balances-panel-order

The `D-n` ids this run rests on, mirrored from the scope's Decisions table
(`_shared/scope-template.md` → `D-n` ids are permanent), plus any the run itself had to make.
`validate-decisions.sh <slug>` traces the scope's ids into `spec.md` and `notes.md`; this file
is the run's own ledger, so a session need not open the scope to know what was settled and a
decision made mid-run has one home.

## From the scope

- none — the epic was cut from triage (`triage batch balance-scheduler`); no `scope.md`.

## Made in this run

- D-1 — split the panel's read into upcoming (T−3..today, soonest first) and past (most recent
  first), each with its own cap, past under an "Eventos passados" subheading — rather than one
  reordered list sharing a 50-row cap; a past pile-up then cannot crowd out a soon-due row by
  construction. Operator, Define, 2026-10-01.
- D-2 — show a "+ N eventos passados não mostrados" line when past rows exceed the cap, so
  truncation is never silent. Operator, Define, 2026-10-01.
