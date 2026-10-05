# Handoff: quote-embedded-checkout

For the next session — human or agent — what to do first and what stands in the way.
Rewritten, not appended, at every stage stop; a stage that STOPs mid-way writes it before it
stops, so nothing is carried in anyone's head.

## Next steps

1. Operator reads `02_define/output/spec.md` (or the PR's Spec block); changes go through `revise quote-embedded-checkout "<what>"`.
2. Operator ticks **Spec approved** on https://github.com/k0d0minio/agorasim/pull/195, then runs `build quote-embedded-checkout`.
3. Build follows `plan.md` pass by pass; first check `STRIPE_PUBLISHABLE_KEY` on Preview and `uat` with `env.sh audit --changed`.

## Blockers

- blocked on operator: tick **Spec approved** on https://github.com/k0d0minio/agorasim/pull/195.

## Do not

- Do not start Build before the tick.
- Do not reintroduce a redirect to stripe.com as a fallback (D-15).
- Do not touch `/reservar`'s booking flow, `lib/booking-checkout.ts` or the webhook beyond what the spec names — stub 1 shipped them.
