# Stub: The FAQ "Quantas pessoas podem participar?" names each car and its seats

- feature-slug: faq-seats-per-car
- epic: open-and-private-tours
- sequence: 3 of 3
- depends-on: none
- complexity: low
- priority: P2

## Problem

The answer says the departures are in small groups and that private tours exist. It gives no
number. Diogo wants the seating capacity of each car in the answer.

## Proposed change

The answer lists the cars and their seats: Citroën 2CV 3 guests, Renault 4L 3 guests, Fiat 600 3
guests, Volkswagen T3 8 guests, and says that groups above 8 contact the team. PT and EN.

## Acceptance criteria

- [ ] The FAQ answer on the home page and on the Rural Saloia page names the four cars and their seats, in PT and EN.
- [ ] The FAQPage JSON-LD carries the new answer.
- [ ] The seat numbers equal `FLEET` in `web/src/lib/fleet.ts`.
- [ ] The live catalogue row changes, not only the fallback in `web/src/content/experiences.ts`.

## Out of scope

- The Óbidos touring vehicle's seat count, which is a placeholder in `fleet.ts`. Its FAQ stays as today until the client gives the number.

## Notes

- The FAQ lives in the Neon `experiences` row, edited at `/admin/experiences` or by a guarded migration (pattern `web/drizzle/0014_obidos_truth.sql`). The fallback is `web/src/content/experiences.ts` lines 133 to 142.
