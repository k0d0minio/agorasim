# Decisions: quote-refund-echo-race

The `D-n` ids this run rests on, mirrored from the scope's Decisions table
(`_shared/scope-template.md` → `D-n` ids are permanent), plus any the run itself had to make.
`validate-decisions.sh <slug>` traces the scope's ids into `spec.md` and `notes.md`; this file
is the run's own ledger, so a session need not open the scope to know what was settled and a
decision made mid-run has one home.

## From the scope

- none — this epic was cut by `triage batch`, with no `scope.md`.

## Made in this run

- D-1 — The webhook defers to the admin path: an unsynced row whose refund carries
  `metadata.via = "admin"` and is under 10 minutes old gets HTTP 503 so Stripe redelivers; no
  schema marker. Operator, Define, 2026-10-01.
- D-2 — A cancellation that follows a "still booked" notice gets its own message kind,
  `quote-event-cancelled` (migration), keyed once per quote. Operator, Define, 2026-10-01.
- D-3 — "Cancelar evento" (`cancelHeldQuote`) sends the same notice — brought into scope.
  Operator, Define, 2026-10-01.
- D-4 — The notice is a dedicated short email (no "refunded now" row) with new PT/EN copy, drafted
  in the spec for the operator to check. Operator, Define, 2026-10-01.
