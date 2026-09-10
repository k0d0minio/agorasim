# Stub: Terms of sale — the page a prepaying guest is owed

- feature-slug: terms-of-sale-page
- epic: launch-cutover
- priority: P1
- size: M
- depends-on: none
- sequence: 3 of 9
- sources: legal lens 2026-08-29: no terms segment exists (`web/src/lib/routes.ts:14-25`), footer links privacy only; full prepayment with no seller identity/NIF at point of sale, no written cancellation procedure, no Art. 6(1)(k)/16(l) Directive 2011/83 statement that the 14-day withdrawal right doesn't apply to date-specific leisure services; pay-button labelling already compliant (`booking.ts:118`)

## Problem

The site takes full payment with no terms of sale anywhere. Required before real
money: seller identity (trading name, NIF, address — from info PDF §1.1), the exact
cancellation/refund procedure (48h rule + weather policy + how to exercise it), the
withdrawal-right exclusion statement, and a checkout that presents the terms before
payment.

## Proposed change

A bilingual `/termos` (+ `/en/terms`) page from a `content/terms.ts` module: seller
identity (Agorasim Vintage · NIF 234840919 · Rua dos Lavadouros 33, Ramilo — from
§1.1; RNAAT number slot filled when it arrives), the sale terms (prices incl. VAT
statement, the 48h cancellation procedure referencing the self-serve link, weather
policy, the Art. 16(l) exclusion in plain words), weddings deposit terms (window per
D9). Checkout gains a pre-payment terms line ("Ao pagar aceita os termos" linked);
footer links it. [LAWYER] pass rides the privacy sign-off.

## Acceptance criteria (rough)

- [ ] /pt/termos + /en/terms live, linked from footer and checkout pre-payment
- [ ] Withdrawal-exclusion + cancellation procedure stated plainly, both locales
- [ ] Seller identity complete except RNAAT (marked pending); CI green

## Prompt

In the agorasim repo (`web/`), build the terms-of-sale page per
`.icm/intake/launch-cutover/terms-of-sale-page.md`: `web/src/content/terms.ts`
(Localized, follow `content/privacy.ts` structure incl. a lastUpdated), a per-locale
route pair like privacidade/privacy, footer link beside privacy
(`web/src/components/site-footer.tsx`), and a terms-acceptance line above the pay
button in `web/src/components/booking-checkout-form.tsx`. Legal facts from
`.icm/docs/agorasim-info.pdf` §1.1 (or redacted successor); cancellation wording must
match `content/booking.ts`/`emails.ts` exactly. Draft-banner it like the privacy page
until counsel sign-off. PR on a `claude/` branch; no local checks — CI is the source
of truth.
