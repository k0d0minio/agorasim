# Chore: quote-one-draft-race

- invariant: behaviour unchanged for every caller that never races itself; only
  the outcome of two simultaneous "Criar orçamento" / "Nova versão" taps for
  the same lead differs — one now lands a draft and the other reads exactly
  the outcome `canStartQuote` / `canCopyAsNewVersion` already give a *sequential*
  second tap (`already-quoted`, `not-editable`), instead of both inserting and
  the card losing track of which draft is which.
- change: `web/src/db/schema.ts`: a partial unique index,
  `quotes_one_draft_per_lead_key`, on `quotes (tour_request_id) where status =
  'draft'` (migration `web/drizzle/0029_quote_one_draft_per_lead.sql`, applied
  and proven on the run's own Neon branch). `web/src/lib/quotes.ts`: a new
  `QuoteDraftConflictError`, and `createQuote`'s insert now catches the
  index's `NeonDbError` (code `23505`, constraint
  `quotes_one_draft_per_lead_key`) and re-throws it as that error — every
  other database error still passes through untouched.
  `web/src/lib/quote-builder.ts`: `createDraftForLead` maps the conflict to
  `{ status: "already-quoted" }` (the same outcome its own pre-check gives);
  `startNewVersion` now wraps `copyQuoteAsDraft` in a `try`/`catch` (it had
  none) and maps the conflict to `{ status: "not-editable" }` (the same
  outcome `canCopyAsNewVersion` gives). Tests: `web/src/lib/quote-writes.test.ts`
  exercises `createQuote` itself against a faked unique violation, for both
  the matching constraint and a different one; `web/src/lib/quote-builder.test.ts`
  exercises the two callers' mapping with `createQuote` / `copyQuoteAsDraft`
  mocked to reject.
- rollback: forward-only (`migrations.reversible: false`) — no `down`. The
  index is purely additive: a code revert that drops the `try`/`catch` still
  runs correctly against a database that has it, and a race that used to
  insert a second draft now surfaces as an uncaught `NeonDbError` instead
  (a 500 on the rare double-tap, not silent data corruption) until the code
  is forward again.
- learned: none
