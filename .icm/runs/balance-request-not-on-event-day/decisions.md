# Decisions: balance-request-not-on-event-day

The `D-n` ids this run rests on, mirrored from the scope's Decisions table
(`_shared/scope-template.md` → `D-n` ids are permanent), plus any the run itself had to make.
`validate-decisions.sh <slug>` traces the scope's ids into `spec.md` and `notes.md`; this file
is the run's own ledger, so a session need not open the scope to know what was settled and a
decision made mid-run has one home.

## From the scope

- none — the epic was cut from triage (`triage batch balance-scheduler`), no `scope.md`

## Made in this run

- D-1 — the T−7 reminder stops at T−1 as well as the T−14 request: it has the same event-morning
  hole (request at T−3 → reminder due at T−0) and also rotates the link. Operator, Define,
  2026-10-01.
