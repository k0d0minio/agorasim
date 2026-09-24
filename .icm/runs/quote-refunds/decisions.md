# Decisions: quote-refunds

The `D-n` ids this run rests on, mirrored from the scope's Decisions table
(`_shared/scope-template.md` → `D-n` ids are permanent), plus any the run itself had to make.
`validate-decisions.sh <slug>` traces the scope's ids into `spec.md` and `notes.md`; this file
is the run's own ledger, so a session need not open the scope to know what was settled and a
decision made mid-run has one home.

## From the scope

- none — the quote-flow epic was re-cut by `/project` and carries no `scope.md`. The register
  decisions it honours: D9 (deposit non-refundable inside 30 days — default, [LAWYER]), D17
  (fees on from the first live booking), D25 (the quote page mints the payment).

## Made in this run

- D-1 — A refund that empties the deposit cancels the event only through the Reembolsar
  dialog's "Cancelar também o evento" box (ticked by default in that case). A Stripe-dashboard
  refund never cancels; it flags the card, which offers a Cancelar evento action. Operator,
  Define, 2026-09-24.
- D-2 — Every instalment refund, from the admin or the dashboard, emails the couple once
  (a new `quote-refunded` kind, keyed per refund). The team gets no copy. Operator, Define,
  2026-09-24.
- D-3 — The refund notice is keyed on (instalment, refunded total after the refund), not on the Stripe refund id: the admin action and its webhook echo reach the same total without either needing the other's id, and `charge.refunded` carries no refund id of its own. Build, 2026-09-24.
- D-4 — Refund and cancellation audit rows use the house convention for `quote.*` actions — `entityType: "tour_request"`, the lead's id, `quoteRef` in `after` — so they show on the lead's history. The spec's "on the quote" read as that. Build, 2026-09-24.
- D-5 — "Cancelar evento" confirms with the typed word `CANCELAR` (`EVENT_CANCEL_CONFIRMATION`); its dialog's way out says "Voltar", so the word is not also on the exit. Build, 2026-09-24.
