# Project: admin-quote-builder

The run's context card — what a fresh session needs before it reads anything else. Pointers,
not copies: the spec stays the spec, the scope stays the scope. Seeded when the run is opened
(`new-run.sh` → `run-pack.sh --init`), sharpened by whichever stage learns something. Read with
`status.md` and `handoff.md` on every resume (`_shared/stage-preamble.md`).

- stub: intake/quote-flow/admin-quote-builder.md
- scope: none
- spec: 02_define/output/spec.md
- touches: web/src/app/admin/sales, web/src/components/admin, web/src/lib/quotes.ts, web/src/lib/booking-emails.ts, web/src/lib/message-log.ts, web/src/lib/cancellation-token.ts, web/src/db/schema.ts, web/drizzle, web/src/content/terms.ts, web/docs/guia-telemovel.md
- complexity: complex → model: opus (executor — select-model.sh --stage 03_build)

## Constraints

- Tour leads are untouched — the card exists only for `kind` wedding/event.
- The quote state machine in `lib/quotes.ts` is the rule: no `sent → draft`, drafts only are
  editable, every write guarded in its `WHERE`. Extend it; do not route around it.
- The token's plaintext lives only in the emailed link — never in a log, an audit payload, an
  error or the Art. 15 export (`lib/cancellation-token.ts` note). No new environment variable.
- No new personal-data column (the notes field was dropped); a `message_log` change keeps the
  lead's cascade erasure (`.icm/docs/data-protection.md`).
- No payment, no Checkout, no public page — stub 3. D9 window stays 30 days; D25 link target.
- Admin strings from `.icm/docs/admin-pt-inventory.md`; ≥44px targets, ≥12px text, PT only (D4).

## Context budget

- Define read `lib/quotes.ts`, the `quotes` / `message_log` schema and the Sales detail's
  imports to settle the new-version and message-uniqueness questions — past its Inputs table.
