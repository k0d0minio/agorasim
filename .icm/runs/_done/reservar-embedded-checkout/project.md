# Project: reservar-embedded-checkout

The run's context card — what a fresh session needs before it reads anything else. Pointers,
not copies: the spec stays the spec, the scope stays the scope. Seeded when the run is opened
(`new-run.sh` → `run-pack.sh --init`), sharpened by whichever stage learns something. Read with
`status.md` and `handoff.md` on every resume (`_shared/stage-preamble.md`).

- stub: intake/embedded-checkout/reservar-embedded-checkout.md
- scope: .icm/runs/embedded-checkout/01_scope/output/scope.md
- spec: 02_define/output/spec.md
- touches: web/src/lib/security-headers.ts, web/next.config.ts, web/src/lib/stripe.ts, web/src/lib/booking-checkout.ts, web/src/app/[locale]/reservar/checkout-actions.ts, web/src/app/[locale]/reservar/page.tsx, web/src/components/booking-checkout-form.tsx, web/src/components/embedded-checkout.tsx, web/src/lib/checkout-draft.ts, web/src/content/, web/src/content/privacy.ts, .icm/docs/data-protection.md, web/package.json
- complexity: standard → model: sonnet (executor — select-model.sh --stage 03_build)

## Constraints

- D-1 embedded Checkout only; D-3 form replaced in place, summary in view, a way back; D-4 the UAT error is not this run's.
- Hold, price, fee, `expires_at`, webhook confirm path, emails and Sales board behaviour unchanged.
- Public pages stay ISR; the publishable key is runtime-only, mode-checked like the secret key.
- Header changes scoped to `/:locale/reservar` and below; `PUBLIC_CSP` and the admin policy unchanged.
- Adding Stripe.js to a page changes the privacy text and `data-protection.md` in the same PR.

## Context budget

- Define read `security-headers.ts`, `booking-checkout.ts` (session creation, `closeUnpaidBooking`), `checkout-actions.ts` (redirect), `stripe.ts` (`keyModeMismatch`), `next.config.ts` headers and the privacy cookies paragraph — beyond the Inputs table, to close the stub's open questions on the policy, the key and going back.
