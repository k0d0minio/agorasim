# Decisions: event-holds-capacity

The `D-n` ids this run rests on, mirrored from the scope's Decisions table
(`_shared/scope-template.md` → `D-n` ids are permanent), plus any the run itself had to make.
`validate-decisions.sh <slug>` traces the scope's ids into `spec.md` and `notes.md`; this file
is the run's own ledger, so a session need not open the scope to know what was settled and a
decision made mid-run has one home.

## From the scope

- none — the quote-flow epic has no `scope.md` (re-cut by `/project`); the register's decisions D9, D10, D20, D25 frame it.

## Made in this run

- D-1 — A deposit-paid wedding or event takes the whole day (both departures) out of the pool. The client's answer to the register's open question, relayed by Jamie in the Define session, 2026-09-25.
- D-2 — The hold is derived from quote status (`deposit_paid`/`paid`) through the shared occupancy count, never written to `availability`; no admin override on a held day. Jamie, Define, 2026-09-25.
- D-3 — A deposit landing on a day with live tour bookings is flagged on the Calendar day sheet and warned in the quote builder (non-blocking); no email, no automatic change to the bookings. Jamie, Define, 2026-09-25.
