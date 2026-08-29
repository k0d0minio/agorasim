# Breakdown: Content truth — the site says what the business actually is

- epic-slug: content-truth
- sources: info PDF §1.4, §2.1–2.5, §3 (client's answers: testimonials, cars, partners, Olaria out); D2 (referrals dropped), D8 (public price tables); 2026-08-29 copy + product lenses

## What I understood

The public site is well-built but tells three lies and misses its cheapest sales
assets: it still sells the retired Olaria MZ (home intro + llms.txt, the AI-answer
feed — which also omits the Óbidos tour and claims booking is enquiry-only); it shows
a classic car on the one tour that isn't in the classics; and it shows **no prices
and no social proof** although the client supplied both with publish permission. The
dropped referral programme still ships a public page, an admin section, and a footer
link on every page. Each fix is small; together they make the site truthful before
the client tests it.

## Build order

1. purge-olaria-refresh-llms — the retired partner gone; llms.txt current — depends-on: none
2. testimonials-section — three quotes + photos live — depends-on: none
3. price-tables-public — real tables + Offer JSON-LD on experience pages — depends-on: none
4. obidos-truth — honest imagery + departure-time copy — depends-on: none
5. remove-referral-surface — the dropped feature actually leaves — depends-on: none
6. wedding-fleet-photos — the missing T3/4L photos land — depends-on: none *(blocked: client)*
7. copy-micro-polish — PT/EN voice consistency tail — depends-on: purge-olaria-refresh-llms

## Out of scope (whole epic)

- A dedicated fleet page — PR #30's casamentos fleet grid carries the named cars.
- llms.txt domain URLs — `launch-cutover/env-driven-domain` owns the domain question;
  stub 1 only fixes facts.
