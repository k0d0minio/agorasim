# Decisions: quote-page-and-deposit-link

The `D-n` ids this run rests on, mirrored from the scope's Decisions table
(`_shared/scope-template.md` → `D-n` ids are permanent), plus any the run itself had to make.
`validate-decisions.sh <slug>` traces the scope's ids into `spec.md` and `notes.md`; this file
is the run's own ledger, so a session need not open the scope to know what was settled and a
decision made mid-run has one home.

## From the scope

- No `scope.md` (the epic was re-cut by `/project`); the register's decisions this run rests on:
- D9 — weddings deposit default: non-refundable inside 30 days, free date change subject to availability.
- D25 — deposit and balance are paid from a token-gated quote page that mints the Checkout session on tap; no long-lived Payment Links.

## Made in this run

Settled with the operator at Define, 2026-09-24:
- RD-1 — `terms.ts`'s events section gains the balance-by-link and no-withdrawal statements; `TERMS_VERSION` moves. The tour withdrawal text (48h) would mislead a couple.
- RD-2 — the accepted terms version is the one the page showed at the tap (session metadata), not the send-time stamp.
- RD-3 — the receipt emails carry the events terms section verbatim with its version (durable medium; a link alone is not one).
- RD-4 — the phone booking bar points at `#orcamento` ("Pedir orçamento") on `/casamentos` and `/eventos`; hidden on the quote page.
- RD-5 — the team gets an email on each paid instalment, as for tour bookings.
- RD-6 — superseded, cancelled, unknown and malformed links share one neutral "no longer valid" page with contacts (404 status).
- RD-7 — the stub's open point (the events "we cancel" rule): its default — state what the terms state, no more.

Made at Build, 2026-09-24 (spec gaps — carried into `03_build/output/notes.md` → Notes for Release):
- RD-8 — the receipt emails carry no link to the quote page: the server stores only the token's digest and the webhook, which usually sends the receipt, never holds the plaintext. The receipt points at the quote email instead. Asked of the operator in session; they chose this over a `revise`.
- RD-9 — a dead quote link is a `noindex` page with a 200 status, not a 404: the locale's `loading.tsx` streams every page under `[locale]`, and a streamed response has sent its status before the token lookup finishes (Next 16's streaming note). A true 404 would need the lookup in `proxy.ts`; not done in this run.
- RD-10 — the "reuse an open session" rule reuses it only when its metadata's terms version is today's; an open session minted under older terms is expired first and replaced, which is the spec's "a replaced open session is expired at Stripe first".
