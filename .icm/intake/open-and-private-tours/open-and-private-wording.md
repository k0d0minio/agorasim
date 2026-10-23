# Stub: The site says "grupo aberto" and "grupo privado", and never that the car is yours alone

- feature-slug: open-and-private-wording
- epic: open-and-private-tours
- sequence: 2 of 3
- depends-on: shared-seats-on-open-departures
- complexity: medium
- priority: P1

## Problem

Under "Preço por pessoa" the price table and the booking page say "O carro é sempre só do vosso
grupo." ("The car is still yours alone."). Diogo says the statement is incorrect. The two kinds
of tour have no name a guest can tell apart.

## Proposed change

Every place that sells a tour names the two kinds. **Grupo aberto** (Open group tour): priced per
person, other people can join the same car. **Grupo privado** (Private group tour): one price for
the group, from the minimum price of the first private tier. The false sentence is removed
everywhere. PT and EN change together.

## Acceptance criteria

- [ ] The price table on each tour page shows "Grupo aberto" and "Grupo privado" as the two headings, with a one-line hint each, in PT and EN.
- [ ] The sentence "O carro é sempre só do vosso grupo." and "The car is still yours alone." appear nowhere on the site.
- [ ] The private heading shows the minimum price: "Grupo privado desde 220 €" for Rural Saloia and the catalogue's minimum for Óbidos.
- [ ] The booking page's "Como querem ir?" step uses the same two names and hints.
- [ ] The confirmation email, the cancellation page, the terms and `public/llms.txt` use the same two names.
- [ ] The experience cards say "desde {price} por pessoa" for open and "desde {price} por grupo" for private, as today.

## Out of scope

- The engine (stub 1).
- The FAQ answer on seats (stub 3).
- Price changes.

## Notes

- The strings live in `web/src/content/pricing.ts` (`perPersonTitle`, `perPersonHint`, `perGroupTitle`, `perGroupHint`, `leadPerGroup`), `web/src/content/booking.ts` (`mode`, `modePublic`, `modePublicHint`, `modePrivate`, `modePrivateHint`, `privateGroup`), `web/src/content/emails.ts` (`modeWords`), `web/src/content/terms.ts` line 130, `public/llms.txt` lines 3, 17, 18 and 21.
- The weddings page sentence "o carro fica reservado em exclusivo para o vosso dia" is true for weddings and stays.
- The FAQs of the add-ons say "experiência privada Rural Saloia". They stay: add-ons are sold on private departures only.
