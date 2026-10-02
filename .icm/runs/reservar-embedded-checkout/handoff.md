# Handoff: reservar-embedded-checkout

For the next session — human or agent — what to do first and what stands in the way.
Rewritten, not appended, at every stage stop; a stage that STOPs mid-way writes it before it
stops, so nothing is carried in anyone's head.

## Next steps

1. Operator adds `STRIPE_PUBLISHABLE_KEY` to Vercel → agorasim → Production (the `pk_…` matching Production's `STRIPE_SECRET_KEY` — `pk_test_` while Production still runs the sandbox `sk_test_`), and confirms the `uat` custom environment has it too.
2. Re-run `/pipeline release reservar-embedded-checkout`: it re-reads the gate, CI and `env.sh audit --changed` (expect `RESULT: OK`), then reviews, records, closes out and merges.

## Blockers

- blocked on operator: `STRIPE_PUBLISHABLE_KEY` missing on Vercel Production (Release stop class 3).

## Do not

- Narrow the key's declared targets to dodge the audit — Production needs it before the batch is promoted.
- Switch to the Payment Element (D-1), or fall back to a redirect to stripe.com on any error.
- Touch the quote page or `lib/quote-checkout.ts` — stub 2 (`quote-embedded-checkout`).
- Bump `@stripe/stripe-js` to 10.x while the server SDK is on `dahlia` (D-11).
