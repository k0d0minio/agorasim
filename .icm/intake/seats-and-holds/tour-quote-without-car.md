# Stub: A scratch tour quote has no car field and still holds its departure

- feature-slug: tour-quote-without-car
- epic: seats-and-holds
- sequence: 5 of 5
- depends-on: none
- complexity: medium
- priority: P1
- blocked: question 6 for Diogo and Rita in `breakdown.md`

## Problem

"Novo orçamento" (`/admin/sales/new`) asks for one car ("Carro": small classic, VW T3 or
touring) on a tour quote. A tour quote can use several cars. The field is also what makes a quote
a tour quote (`quotes.hold_vehicle_class`). A quote without it counts as an event: the event rate
applies, and a paid quote blocks the whole day (`eventHoldKeysBetween` in
`web/src/lib/event-holds.ts`).

## Proposed change

The scratch quote form for a tour has no car field. The quote stays a tour quote. It holds its
departure as question 6 says. The quote page and the emails keep the tour labels and the
departure row.

## Acceptance criteria

- [ ] `/admin/sales/new` with "Tipo: Passeio" shows no "Carro" field, and the quote saves without one.
- [ ] A paid tour quote holds its departure as question 6 says, and does not block the other departure of the day.
- [ ] The tour commission rate applies to a tour quote, not the event rate.
- [ ] The customer's quote page and emails show "Passeio" and the departure, as today.
- [ ] Existing tour quotes with a car keep working.

## Out of scope

- A list of cars per quote.

## Notes

- Files: `web/src/components/admin/lead-quote-card.tsx` (`ScratchQuoteForm`), `web/src/lib/form-schemas.ts` (`parseTourHold`), `web/src/lib/tour-quote.ts` (`isTourQuote`, `tourHoldOf`), `web/src/lib/event-holds.ts`, `web/src/lib/quote-checkout.ts` (`checkTourHold`), `web/src/db/schema.ts`.
- A tour quote needs a marker other than `hold_vehicle_class`, for example a `kind` on the quote. That is a migration.
- Decision open. Keep the Spec approved gate.
