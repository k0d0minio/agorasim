# Handoff: reservar-embedded-checkout

For the next session — human or agent — what to do first and what stands in the way.
Rewritten, not appended, at every stage stop; a stage that STOPs mid-way writes it before it
stops, so nothing is carried in anyone's head.

## Next steps

1. Operator reads `02_define/output/spec.md` and ticks **Spec approved** on https://github.com/k0d0minio/agorasim/pull/175.
2. Then `/pipeline build reservar-embedded-checkout` — follow `plan.md` pass by pass.

## Blockers

- blocked on operator: tick **Spec approved** on PR #175.
- blocked on operator (before the smoke, not before Build): set `STRIPE_PUBLISHABLE_KEY` (the `pk_test_…` matching the existing `sk_test_…`) in Vercel for Preview and the `uat` environment — without it the preview shows the enquiry form, by design.

## Do not

- Switch to the Payment Element (D-1), or fall back to a redirect to stripe.com on any error.
- Fix the UAT "There was an error processing your request." error here (D-4 — its own bug lane).
- Touch the quote page or `lib/quote-checkout.ts` — stub 2 (`quote-embedded-checkout`).
- Use a `NEXT_PUBLIC_` variable for the publishable key, or a per-request nonce on `/reservar` (ISR).
- Change the CSP or Permissions-Policy of any route other than `/:locale/reservar` and below.
