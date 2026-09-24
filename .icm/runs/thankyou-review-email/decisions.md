# Decisions: thankyou-review-email

The `D-n` ids this run rests on, mirrored from the scope's Decisions table
(`_shared/scope-template.md` → `D-n` ids are permanent), plus any the run itself had to make.
`validate-decisions.sh <slug>` traces the scope's ids into `spec.md` and `notes.md`; this file
is the run's own ledger, so a session need not open the scope to know what was settled and a
decision made mid-run has one home.

## From the scope

- No `scope.md` (epic re-cut by `/project`). Register decisions honoured: D24 (soft opt-in
  thank-you, every guest, opt-out line, policy in the same PR), D5 (email first, no SMS).

## Made in this run

- D-1 — The opt-out is an address-level suppression list (`email_opt_outs`, HMAC of the
  address under a dedicated never-rotated `EMAIL_OPT_OUT_SECRET`), surviving erasure; opting
  out also withdraws explicit marketing consent. Operator, Define 2026-09-24.
- D-2 — A no-show mark (`bookings.no_show_at`, "Marcar falta" / "Faltou" on the Sales board)
  ships in this run and suppresses only the thank-you. Operator, Define 2026-09-24.
- D-3 — The job looks back two days (yesterday and the day before, Lisbon) so a missed run or
  failed send is retried once. Operator, Define 2026-09-24.
- D-4 — The opt-out link opens a confirm page (POST button; GET records nothing) and the email
  carries RFC 8058 List-Unsubscribe / List-Unsubscribe-Post headers. Operator, Define 2026-09-24.
