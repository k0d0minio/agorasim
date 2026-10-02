# Handoff: reservar-embedded-checkout

For the next session — human or agent — what to do first and what stands in the way.
Rewritten, not appended, at every stage stop; a stage that STOPs mid-way writes it before it
stops, so nothing is carried in anyone's head.

## Next steps

1. Operator sets `STRIPE_PUBLISHABLE_KEY` in Vercel (Preview and the `uat` environment: the `pk_test_…` paired with the current `sk_test_…`; Production: the `pk_live_…` when the live secret key goes in), then redeploys the preview.
2. Operator smokes the preview (https://agorasim-git-claude-embedded-checkout-reservar-tikixx-kodominio.vercel.app/pt/reservar and /en/reservar) against the acceptance criteria — the five left unticked on PR #175 are the ones only a browser proves.
3. Operator ticks **Ready to merge** on https://github.com/k0d0minio/agorasim/pull/175, then `/pipeline release reservar-embedded-checkout`.

## Blockers

- blocked on operator: set `STRIPE_PUBLISHABLE_KEY` in Vercel (Preview, `uat`) — without it the preview's `/reservar` shows the enquiry form by design.
- blocked on operator: tick **Ready to merge** on PR #175 after the smoke.

## Do not

- Switch to the Payment Element (D-1), or fall back to a redirect to stripe.com on any error.
- Fix the UAT "There was an error processing your request." error here (D-4 — its own bug lane).
- Touch the quote page or `lib/quote-checkout.ts` — stub 2 (`quote-embedded-checkout`).
- Use a `NEXT_PUBLIC_` variable for the publishable key, or a per-request nonce on `/reservar` (ISR).
- Bump `@stripe/stripe-js` to 10.x while the server SDK is on `dahlia` (D-11).
