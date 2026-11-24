# Handoff jam-528

## Next action

Jamie tests "Para faturar" on the preview of PR #293, ticks Ready to merge, then says
`release JAM-528`. The release has migration `0047_invoicing`: run `migrate-production.yml`
with the tag before the promotion.

## Decisions

- Q1 (Jamie, chat, 2026-11-24): the default. A new table `refunds`, one row for each refund.
  The admin refund paths and the Stripe webhook write it (`lib/refund-ledger.ts`), best
  effort. A refund from before the table shows once, from the total on the payment row.
- The marks are in `invoice_marks`, keyed on the line (`booking:<id>`, `quote-payment:<id>`,
  `refund:<id>`, `legacy-refund:…`). A second mark replaces the number. "Retirar marca"
  deletes it. Both write the audit log (`invoice.marked`, `invoice.unmarked`).
- A paid booking is one with a Stripe payment and `confirmed_at`. Its date is
  `confirmed_at`. An instalment's date is `paid_at`. The day is in Europe/Lisbon.
- The page reads all lines, not one day: "Em atraso" needs every past day. Test data on UAT
  shows as overdue until someone marks it.

## Acceptance criteria

- Lines of the chosen day with date, name, NIF, service and amount (agent): not verified on
  a page. The preview needs a Vercel sign-in.
- Mark stays after a reload (agent): not verified on a page. The action is an upsert on a
  unique key.
- Unmarked past line on top in "Em atraso" (agent): covered by `invoicing.test.ts`. Not
  seen on a page.
- Lines include bookings, deposits, balances and refunds, not unpaid bookings (CI): met,
  `invoicing.test.ts`, and the read filters on a payment and `confirmed_at`.
- Two partial refunds give two lines (CI): met, `invoicing.test.ts`.
- Diogo or Rita marks a line on a phone (operator): open.

## How to test

On the preview, open `/admin/sales` and tap "Para faturar". Go back to the day of a test
payment, type a number in a line and tap "Fatura emitida". Reload: the line keeps the
number. An unmarked payment of an earlier day shows in "Em atraso" at the top.

## Blockers

- none

## Do not touch

- none
