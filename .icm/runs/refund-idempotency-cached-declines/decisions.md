# Decisions: refund-idempotency-cached-declines

The `D-n` ids this run rests on, mirrored from the scope's Decisions table
(`_shared/scope-template.md` → `D-n` ids are permanent), plus any the run itself had to make.
`validate-decisions.sh <slug>` traces the scope's ids into `spec.md` and `notes.md`; this file
is the run's own ledger, so a session need not open the scope to know what was settled and a
decision made mid-run has one home.

## From the scope

- none — the epic was cut from triage (`triage batch quote-refunds`) and carries no `scope.md`.

## Made in this run

- D-1 — The tour refund is keyed on the claim (`booking-refund:<id>:<cancelledAt ms>`), not on a
  form-carried id: the claim already makes it one attempt per booking, so no form changes. Define,
  operator's choice, 2026-10-01.
- D-2 — A quote refund post without a valid `attemptId` is refused ("Recarregue a página e tente
  de novo."), never given a server-generated key: losing double-submit collapse silently is worse
  than one reload. Define, operator's choice, 2026-10-01.
