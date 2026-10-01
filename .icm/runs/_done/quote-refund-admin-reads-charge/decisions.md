# Decisions: quote-refund-admin-reads-charge

The `D-n` ids this run rests on, mirrored from the scope's Decisions table
(`_shared/scope-template.md` → `D-n` ids are permanent), plus any the run itself had to make.
`validate-decisions.sh <slug>` traces the scope's ids into `spec.md` and `notes.md`; this file
is the run's own ledger, so a session need not open the scope to know what was settled and a
decision made mid-run has one home.

## From the scope

- none — the epic was cut from triage (`triage batch quote-refunds`); no `scope.md`, no `D-n` rows

## Made in this run

- D-1 — On a stale row the couple's one notice reports everything newly recorded ("refunded now" = Stripe's total − the row's prior figure), not just this refund. Operator's call in Define, 2026-10-01: the couple hear about every euro once, with the dashboard door's arithmetic.
- D-2 — A failed post-refund read falls back to row + this refund (logged); the refund is never reported as failed once Stripe accepted it. From the stub's Proposed change; Define.
- D-3 — The late/out-of-order `charge.refunded` snapshot finding is parked, not folded in (`intake/triage/refund-webhook-stale-charge-snapshot.md`). Operator's call in Define, 2026-10-01.
