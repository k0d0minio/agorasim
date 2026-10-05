# Decisions: refund-paths-dedupe

The `D-n` ids this run rests on, mirrored from the scope's Decisions table
(`_shared/scope-template.md` → `D-n` ids are permanent), plus any the run itself had to make.
`validate-decisions.sh <slug>` traces the scope's ids into `spec.md` and `notes.md`; this file
is the run's own ledger, so a session need not open the scope to know what was settled and a
decision made mid-run has one home.

## From the scope

- none — epic cut by `triage batch`, no `scope.md`

## Made in this run

- D-1 — the sync half shares only its prologue, through a second helper `chargeRefundState`
  (`refundPaymentIntent` creates refunds; the syncs never do). Operator, at Define.
- D-2 — both shared helpers live in `booking-refund.ts`, beside the three already shared from
  there; no new module. Operator, at Define.
- D-3 — `refundPaymentIntent` takes `metadata` as `Record<string, string>` rather than Stripe's
  metadata type: every value passed is a string, and a plain record stays valid whatever Stripe names its type.
  Build; not a spec gap.
