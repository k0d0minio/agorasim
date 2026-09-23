# Decisions: admin-quote-builder

The `D-n` ids this run rests on, mirrored from the scope's Decisions table
(`_shared/scope-template.md` → `D-n` ids are permanent), plus any the run itself had to make.
`validate-decisions.sh <slug>` traces the scope's ids into `spec.md` and `notes.md`; this file
is the run's own ledger, so a session need not open the scope to know what was settled and a
decision made mid-run has one home.

## From the scope

No `scope.md` — the epic was re-cut by `/project`. The register decisions this run honours:

- D4 — the admin is Portuguese only.
- D9 — weddings deposit non-refundable inside 30 days (the quote's `terms_window_days` default).
- D20 — quoting by hand until the builder, deposit page and balance job land; this run ends the builder half.
- D25 — the deposit and balance are paid from a token-gated quote page; the email links to it.

## Made in this run

Settled with the operator in Define, 2026-09-23 (run-local ids):

- D-1 — A sent quote is changed by supersede: "Nova versão" copies it into a draft; sending that draft cancels the old one and kills its link. Only from `sent`.
- D-2 — No notes field on the quote; line labels explain, the lead's internal notes stay internal.
- D-3 — The total is the sum of the line items (label × quantity × unit price); at least one line.
- D-4 — The emailed link 404s until `quote-page-and-deposit-link` ships; accepted, no code guard, the stub may promote alone.
- D-5 (Define's own) — "Reenviar" rotates the link and emails again, covering a failed send and a wrong address; `quote-sent` is logged per quote and per link, not per lead.
