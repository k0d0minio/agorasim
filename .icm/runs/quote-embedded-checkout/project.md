# Project: quote-embedded-checkout

The run's context card — what a fresh session needs before it reads anything else. Pointers,
not copies: the spec stays the spec, the scope stays the scope. Seeded when the run is opened
(`new-run.sh` → `run-pack.sh --init`), sharpened by whichever stage learns something. Read with
`status.md` and `handoff.md` on every resume (`_shared/stage-preamble.md`).

- stub: intake/embedded-checkout/quote-embedded-checkout.md
- scope: .icm/runs/embedded-checkout/01_scope/output/scope.md
- spec: 02_define/output/spec.md
- touches: web/src/lib/quote-checkout.ts, web/src/lib/quote-checkout.test.ts, web/src/app/[locale]/orcamento/actions.ts, web/src/components/quote-pay-form.tsx, web/src/components/embedded-checkout.tsx, web/src/content/quote-page.ts, web/src/lib/security-headers.ts, web/src/lib/security-headers.test.ts, web/src/lib/payment-route.ts, web/src/lib/stripe.ts, web/src/content/privacy.ts, .icm/docs/data-protection.md
- complexity: standard → model: sonnet (executor — select-model.sh --stage 03_build)

## Constraints

- The never-two-payable-sessions rule in `lib/quote-checkout.ts` holds on every branch (reuse, older terms, hosted, race, completed, delayed-failed).
- The token rides only in the `return_url` Stripe already holds — never logged, never in metadata, never in a new URL.
- Connect fee, `QUOTE_SESSION_TTL_MINUTES`, `recordQuotePayment`, `reconcileQuoteReturn`, the webhook and the receipts are unchanged.
- No redirect to stripe.com on any path, including a missing publishable key (D-15) and a failed form load.
- Headers change only on `/:locale/orcamento/**`; admin and every other public route byte-identical.
- Privacy PT/EN and the data-protection Stripe row change in the same PR. No new third party.
- Out of scope: refunds, admin quote tools, the UAT payment error (D-4), Payment Element, dashboard branding and methods.

## Context budget

- Define read `web/src/lib/quote-checkout.ts`, `quote-pay-form.tsx`, `orcamento/actions.ts`, `orcamento/[token]/page.tsx`, `embedded-checkout.tsx`, `payment-route.ts` and excerpts of `security-headers.ts`, `stripe.ts`, `privacy.ts` beyond the Inputs — the open placement/landing/key questions and `touches:` needed them.
