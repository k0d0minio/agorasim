# Stub: 4% application fee (min €10, cap €50) on tour checkouts, audited per booking

- feature-slug: tour-application-fees
- epic: commission-engine
- priority: P1
- size: M
- depends-on: connect-scaffolding
- sequence: 2 of 3
- sources: agreement §4 (worked examples: €150→€10 floor; €470→≈€19; €900→€36; €1,400→€50 cap); 2026-08-29 data lens (no `application_fee_amount` anywhere; no commission columns on `bookings`)

## Problem

No fee is computed or recorded anywhere. The agreement's tour rate is 4% of the final
booking total with a €10 floor and €50 cap; both sides must be able to reconcile
against the Stripe dashboard, and refunds later need to know exactly what fee was
taken on which charge.

## Proposed change

A pure fee module (mirroring `lib/pricing.ts`'s style) computing the tour fee in
cents with floor/cap, unit-tested against the agreement's four worked examples;
`application_fee_amount` set on the checkout session when the connected account is
active; `bookings` gains audit columns (fee cents, rate applied, floor/cap flag,
connected account id, charge id) written at confirmation from the webhook payload.
Include the 6% events rate in the same module (used later by quote-flow).

## Acceptance criteria (rough)

- [ ] Fee module reproduces all four worked examples from the agreement exactly
- [ ] Sandbox checkout creates the session with the right `application_fee_amount`
- [ ] Confirmed booking rows carry fee, rate, and charge id
- [ ] No fee when the connected account env is unset; CI green

## Prompt

In the agorasim repo (`web/`), implement the commission fee per
`.icm/intake/commission-engine/tour-application-fees.md`: a pure module
`web/src/lib/commission.ts` (4% min 1000 cap 5000 cents for tours; 6% no-floor-no-cap
for events; unit tests against the worked examples in
`.icm/docs/agorasim-commission-and-payments-agreement.pdf` §4–5), wire
`application_fee_amount` into the Connect-aware session creation in
`web/src/lib/booking-checkout.ts`, and add a drizzle migration for per-booking fee
audit columns written at webhook confirmation. PR on a `claude/` branch; no local
checks — CI is the source of truth.
