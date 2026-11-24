# Handoff jam-527

## Next action

Jamie tests the change on the preview of PR #292, ticks Ready to merge, then says
`release JAM-527`. Then `build JAM-528`: its branch merges this branch first.

## Decisions

- Q1 (Jamie, chat, 2026-11-24): the default. Nine digits, with or without `PT`, is a
  Portuguese NIF and its check digit is checked. Any other value is a foreign number, up to
  20 characters.
- The NIF is on `tour_requests.tax_id` (the lead of a booking or an enquiry) and on
  `quotes.tax_id`. Migration `0046_guest_tax_id`: two nullable columns, nothing else.
- A quote's NIF: an empty field keeps the number of an earlier instalment.
- The checkout draft in the browser does not keep the NIF.
- Retention: the anonymisation clears the NIF with the other identifiers. Erasure of a
  quote clears its NIF.

## Acceptance criteria

- Book with and without a NIF (agent): not verified on a page. The preview needs a Vercel
  sign-in and the local dev server did not start. CI tests cover the action and the schema.
- Wrong check digit refused, fields kept (agent): covered by CI tests of both `/reservar`
  actions and the quote action. Not seen on a page.
- Validation function (CI): met, `tax-id.test.ts`.
- Admin shows the NIF (operator): open.
- Art. 15 export has the NIF (CI): met, `subject-data.test.ts`.
- Privacy policy names the NIF, pt and en (operator): open.

## How to test

On the preview, open `/pt/reservar` and send an enquiry with the NIF 123456780: the form
refuses it and keeps your other fields. Send it again with 123456789, then open the lead in
`/admin/sales`: the NIF shows under Telefone. Read the new NIF paragraph on `/pt/privacidade`
and `/en/privacy`.

## Blockers

- none

## Do not touch

- none
