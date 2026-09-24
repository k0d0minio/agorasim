# Project: quote-page-and-deposit-link

The run's context card — what a fresh session needs before it reads anything else. Pointers,
not copies: the spec stays the spec, the scope stays the scope. Seeded when the run is opened
(`new-run.sh` → `run-pack.sh --init`), sharpened by whichever stage learns something. Read with
`status.md` and `handoff.md` on every resume (`_shared/stage-preamble.md`).

- stub: intake/quote-flow/quote-page-and-deposit-link.md
- scope: none
- spec: 02_define/output/spec.md
- touches: web/src/app/[locale]/orcamento, web/src/app/api/stripe/webhook, web/src/lib/quotes.ts, web/src/lib/quote-token.ts, web/src/lib/quote-builder.ts, web/src/lib/booking-emails.ts, web/src/lib/message-log.ts, web/src/lib/stripe.ts, web/src/lib/commission.ts, web/src/db/schema.ts, web/drizzle, web/src/content/terms.ts, web/src/components/booking-bar.tsx, web/src/app/[locale]/layout.tsx
- complexity: complex → model: opus (executor — select-model.sh --stage 03_build)

## Constraints

- D25: the page mints the Checkout session on tap; no Stripe Payment Link objects, no session
  minted on page load, no raw session URL in any email.
- D9: deposit wording unchanged (30%, non-refundable inside 30 days); no "we cancel" rule and
  no "sinal" change — `[LAWYER]`.
- The tour paths (`confirmPaidBooking`, `closeUnpaidBooking`, refunds) are untouched for
  non-quote sessions; refunds of quote instalments are stub 4, the T−14 issue job stub 6.
- The page is per-guest: `force-dynamic`, never ISR (`/AGENTS.md` § Conventions).
- The quote token's plaintext never lands in a log, audit row, error or metadata.

## Context budget

- Define read `quotes.ts` (payments, lead move), `quote-token.ts`, `message-log.ts` kinds, the
  webhook's paid branch, `booking-checkout.ts`'s session creation, `terms.ts` headings and
  `booking-bar.tsx` to settle the mint, webhook ordering and terms questions.
