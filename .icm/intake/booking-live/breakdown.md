# Breakdown: Booking live — the sandbox v1 Diogo & Rita can test

- epic-slug: booking-live
- sources: deal objective 2026-08-27 (DEAL.md: "sandbox payments working at agorasim.jamienisbet.com, booking end-to-end, ASAP"); proposal feature ③; prices.pdf; info PDF §1.5; PR #31 + PR #30 (D1); 2026-08-29 lens findings (product/ux)

## What I understood

The booking engine is substantially built and tested but **dead in production**: the
catalogue resolver drops the `pricing` column, so checkout never renders and every
visitor gets the enquiry form. The correct availability model (2 drivers × 4 cars)
is complete on open PR #31; the weddings content of PR #30 shows "merged" on GitHub
but never reached main. Landing those three things, fixing the checkout's real UX
defects, and sweeping the fixtures off the Sales board produces the version Diogo &
Rita test. Handover ends with the link sent to them (human gate). One real-money
correctness question (PAX vs adults in tiers) is blocked on the client and must land
before live keys, not before the sandbox test.

## Build order

1. land-availability-pools — merge PR #31 — depends-on: none
2. fix-pricing-mapping — map `pricing` through the catalogue resolver — depends-on: none
3. rescue-weddings-content — PR #30's content onto today's main — depends-on: land-availability-pools
4. checkout-ux-fixes — cancel-return rehydration, tour carry-through, starting points, metadata, eventos CTA — depends-on: fix-pricing-mapping
5. calendar-sweep-safety — confirmations on bulk sweeps; stop nulling notes; caption floor — depends-on: land-availability-pools
6. remove-example-bookings — real Sales board only — depends-on: none
7. sandbox-e2e-handover — full pass against the documents, then the link goes out — depends-on: checkout-ux-fixes
8. pax-tier-semantics — PAX vs adults in tiers/minimums — depends-on: sandbox-e2e-handover *(blocked: client)*

## Out of scope (whole epic)

- Commission fees (commission-engine/), cancellation flow (cancellation-selfserve/),
  quote flow (quote-flow/), lifecycle emails beyond the existing confirmation
  (lifecycle-messages/).
- Lifting the >8-party enquiry fallback and seat sharing — blocked on the client's
  big-groups answer; PR #31's conservative defaults stand.
