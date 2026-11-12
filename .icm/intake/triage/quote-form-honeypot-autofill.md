# Stub: A wedding or event enquiry from a browser with autofill reaches the team

- lane: bug
- found-by: feedback round 2 ("the wedding quotes aren't working"), UAT runtime logs · 2026-11-12
- complexity: low
- priority: P0

## Problem

On 2026-11-11 at 18:37, 18:40 and 18:41 UTC, Diogo and Rita sent three wedding enquiries on
`uat.agorasim.pt` (`/en/casamentos` twice, `/pt/casamentos` once). Each one logged
`[quote] discarded honeypot submission` and showed "Pedido enviado!". No row and no email
followed. The browser's autofill filled the hidden trap field `company_website`
(`web/src/lib/honeypot.ts`). Chrome ignores `autoComplete="off"`. A test enquiry with no
autofill on 2026-11-12 reached `tour_requests` and sent both emails.

## Proposed change

Make the trap a field that no autofill fills, on every form that uses it. Do not let a trap hit
look like a real success with no trace.

## Acceptance criteria

- [ ] The trap field has a name and a label that browser autofill and password managers do not match, for example no "company", "website", "name", "email", "phone" or "address".
- [ ] With Chrome autofill on and a saved address profile, an enquiry on `/pt/casamentos`, `/en/casamentos` and `/pt/eventos` reaches the Sales board and sends both emails.
- [ ] The same holds for the tour enquiry form and the booking checkout (`tour-request-form.tsx`, `booking-checkout-form.tsx`).
- [ ] A submission with the trap field filled is still discarded and still logged.
- [ ] A unit test covers the discard and the pass for each of the three actions.

## Notes

- Files: `web/src/lib/honeypot.ts`, `web/src/components/quote-request-form.tsx`, `web/src/components/tour-request-form.tsx`, `web/src/components/booking-checkout-form.tsx`, `web/src/app/[locale]/quote-actions.ts`, `web/src/app/[locale]/reservar/actions.ts`, `web/src/app/[locale]/reservar/checkout-actions.ts`.
- Optional second guard: a minimum fill time. Not required.
