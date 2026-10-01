# Decisions: quote-refund-guard-post-refund-writes

The `D-n` ids this run rests on, mirrored from the scope's Decisions table
(`_shared/scope-template.md` → `D-n` ids are permanent), plus any the run itself had to make.
`validate-decisions.sh <slug>` traces the scope's ids into `spec.md` and `notes.md`; this file
is the run's own ledger, so a session need not open the scope to know what was settled and a
decision made mid-run has one home.

## From the scope

- none — the stub was cut by `triage batch`; the epic has no `scope.md`.

## Made in this run

- D-1 — "refunded, records not updated" closes the refund dialog (ok state) and shows a red
  warning under Reembolsar, saying not to refund again: an open dialog with the typed confirmation
  is one click from a duplicate refund once the webhook has changed the idempotency key. Define,
  operator's choice.
- D-2 — nothing is retried in the catch, the requested cancellation included; the warning says
  the cancellation is not confirmed and to check the card. The webhook never cancels an event, so
  the operator finishes it. Define, operator's choice.
