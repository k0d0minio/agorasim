# Stub: The wedding form asks the ceremony time, not the hours of service

- feature-slug: ceremony-time-instead-of-service-hours
- epic: wedding-quotes
- sequence: 2 of 6
- depends-on: wedding-form-without-guest-count
- complexity: medium
- priority: P1

## Problem

The wedding form asks "Horas de serviço" with three durations: "Meio dia (até 4h)", "Dia inteiro
(até 8h)", "Ainda não sabemos". Diogo: "We don't charge by the hour for weddings. We charge per
event." He wants "Hora da cerimónia" (Ceremony time) instead.

## Proposed change

The wedding form asks the ceremony time as a time of day, optional. The value reaches the Sales
board lead page and the team email under "Hora da cerimónia". The "How it works" step on the
weddings page says "hora da cerimónia" in place of "horas de serviço".

## Acceptance criteria

- [ ] `/casamentos` asks "Hora da cerimónia" / "Ceremony time" as a time field, optional, in PT and EN. The durations select is gone from the wedding form.
- [ ] The admin lead page shows "Hora da cerimónia" with the value for a wedding lead.
- [ ] The team email for a wedding enquiry shows "Hora da cerimónia".
- [ ] The weddings page step reads "Data, local da cerimónia, hora da cerimónia e o carro dos vossos sonhos." in PT, with the EN kept in sync.
- [ ] Existing leads with a `service_hours` value still display it.

## Out of scope

- The quote builder's line placeholder "Carro clássico com motorista, 6 horas". The line is free text.

## Notes

- Decisions this stub leaves open. Jamie answers them in the pull request before the build:
  1. Does `/eventos` keep "Horas de serviço"? Default: yes. The feedback names weddings only.
  2. Storage. Default: a new nullable column `ceremony_time` (time without zone) on `tour_requests`, next to `service_hours`.
- Files: `web/src/content/weddings.ts` lines 66 to 67 and 128, `web/src/content/quote-request.ts` lines 49 to 62, `web/src/components/quote-request-form.tsx` lines 192 to 204, `web/src/lib/form-schemas.ts` lines 955 to 957, `web/src/db/schema.ts` line 599, `web/src/content/emails.ts` line 1079, `web/src/lib/booking-emails.ts` lines 1291 to 1294, `web/src/app/admin/sales/[id]/page.tsx` lines 374 to 376.
