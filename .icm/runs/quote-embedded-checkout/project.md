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

- <what must stay true while this run is built — from the spec's Out of scope, the `D-n`
  decisions in `decisions.md`, and `_shared/project-rules.md`>

## Context budget

- <what was loaded beyond the stage's Inputs, and why — the stage's overrun note lives here>
