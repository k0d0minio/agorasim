# Stub: The wedding enquiry form no longer asks the number of guests

- feature-slug: wedding-form-without-guest-count
- epic: wedding-quotes
- sequence: 1 of 6
- depends-on: none
- complexity: low
- priority: P1

## Problem

The wedding form on `/casamentos` asks "Número de convidados". Diogo wants the field removed:
the number of guests does not change what Agorasim sells at a wedding. The same form component
serves `/eventos`, where the field reads "Número de participantes" and stays.

## Proposed change

The wedding form shows no guest-count field. The event form keeps its field. The admin lead page
and the team email hide the "Pessoas" row when the value is empty.

## Acceptance criteria

- [ ] `/casamentos` shows no "Número de convidados" / "Number of guests" field, in PT and EN.
- [ ] `/eventos` still shows "Número de participantes" / "Number of people".
- [ ] A wedding enquiry submits and lands on the Sales board with `party_size` empty.
- [ ] The admin lead page and the team email show no empty "Pessoas" row.

## Out of scope

- The ceremony time (stub 2).

## Notes

- The field is `partySize` in `web/src/components/quote-request-form.tsx` lines 220 to 232, with the label at `web/src/content/weddings.ts` line 131 and the copy type at `web/src/content/quote-request.ts` line 34, where `labels.partySize` is required. The column `tour_requests.party_size` is nullable already.
