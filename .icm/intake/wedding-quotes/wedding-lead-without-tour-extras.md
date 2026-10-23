# Stub: A wedding or event lead no longer shows the tour experience and extras pickers

- feature-slug: wedding-lead-without-tour-extras
- epic: wedding-quotes
- sequence: 6 of 6
- depends-on: none
- complexity: low
- priority: P2

## Problem

The "Detalhes" card on a lead page shows an "Experiência" select and "Extras" checkboxes for every
lead, wedding and event leads included. Diogo: "The extras from the experiences must not appear
in the wedding quotes (still appears on our side)." The quote lines themselves are free text and
show no extras.

## Proposed change

The "Experiência" select and the "Extras" checkboxes render only on a tour lead. A wedding or
event lead's "Detalhes" card shows date, venue, car and the wedding fields.

## Acceptance criteria

- [ ] A wedding lead page shows no "Experiência" select and no "Extras" checkboxes.
- [ ] An event lead page shows neither.
- [ ] A tour lead page shows both as today.
- [ ] The header "Experiência" row is hidden on wedding and event leads.

## Out of scope

- The quote builder, which lists no catalogue items.

## Notes

- `web/src/components/admin/lead-edit-form.tsx` lines 77 to 83, 159 to 174, 203 to 229. `web/src/app/admin/sales/[id]/page.tsx` lines 333 to 347 and 451 to 466 pass the catalogue and render the card for every kind.
