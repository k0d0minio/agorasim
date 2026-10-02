# Handoff: reservar-embedded-checkout

For the next session — human or agent — what to do first and what stands in the way.
Rewritten, not appended, at every stage stop; a stage that STOPs mid-way writes it before it
stops, so nothing is carried in anyone's head.

## Next steps

1. Build: pre-flip check (`ci-status.sh`), merge `origin/main`, `security-check.sh --branch`, flip ready, post-flip push, full verdict.

## Blockers

- none for Build. Before the smoke: `STRIPE_PUBLISHABLE_KEY` must exist in Vercel (Preview, `uat`, Production) — blocked on operator for the smoke, not for the code.

## Do not

- Switch to the Payment Element (D-1), or fall back to a redirect to stripe.com on any error.
- Fix the UAT "There was an error processing your request." error here (D-4 — its own bug lane).
- Touch the quote page or `lib/quote-checkout.ts` — stub 2 (`quote-embedded-checkout`).
- Use a `NEXT_PUBLIC_` variable for the publishable key, or a per-request nonce on `/reservar` (ISR).
- Bump `@stripe/stripe-js` to 10.x while the server SDK is on `dahlia` (D-11).
