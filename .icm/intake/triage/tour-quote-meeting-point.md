# Stub: A tour quote says "Meeting point", not "Venue"

- lane: tweak
- found-by: feedback round 2 ("the customer is receiving the term Venue instead of Meeting Point") · 2026-11-12
- complexity: low
- priority: P1

## Problem

A tour quote shows the label "Venue" (EN) and "Local" (PT) on the customer's quote page and in
the quote emails. The admin labels the same field "Ponto de encontro" for a tour. The labels are
in `web/src/content/quote-page.ts` and `web/src/content/emails.ts` (quote sent, balance, receipt,
refund).

## Proposed change

A tour quote labels the field "Meeting point" (EN) and "Ponto de encontro" (PT) on the quote page
and in every quote email. A wedding or event quote keeps "Venue" and "Local".

## Acceptance criteria

- [ ] An EN tour quote shows "Meeting point" on its quote page and in its sent, balance, receipt and refund emails.
- [ ] A PT tour quote shows "Ponto de encontro" in the same places.
- [ ] An EN wedding quote still shows "Venue", and a PT one "Local".
