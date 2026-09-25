# Decisions: balance-scheduler

The `D-n` ids this run rests on, mirrored from the scope's Decisions table
(`_shared/scope-template.md` → `D-n` ids are permanent), plus any the run itself had to make.
`validate-decisions.sh <slug>` traces the scope's ids into `spec.md` and `notes.md`; this file
is the run's own ledger, so a session need not open the scope to know what was settled and a
decision made mid-run has one home.

## From the scope

- none — the quote-flow epic was cut by `/project`, not by Scope; the register's D25 (the quote page mints the Checkout session) binds this run.

## Made in this run

- D-1 — each balance email mints a fresh quote link (the stored digest is swapped); earlier links retire. Define, with the operator.
- D-2 — the T−7 reminder is in, one send, only if the request reached the couple ≥ 3 Lisbon days earlier. Define, with the operator (stub default).
- D-3 — the T−3 flag is computed (Sales board panel + quote-card badge), no job, no column, no team email. Define, with the operator.
- D-4 — the link is minted *after* the log claim is won (`ClaimedMessage` in `sendLoggedEmail`), not before it as the spec's order read: a run that rotated before claiming could kill the link a racing winner was mailing. The compare-and-swap stays as a second guard. Build — a spec gap, in Notes for Release.
- D-5 — the T−14 request is not sent once the event has passed (`listQuotesDueForBalance` reaches back without a floor); such a balance is the team's, on the panel. Build — a spec gap, in Notes for Release.
- D-6 — the deposit receipt's "your quote stays at the link in the quote email" now reads "until then", since the balance email retires that link. Build — a consequence of D-1.
