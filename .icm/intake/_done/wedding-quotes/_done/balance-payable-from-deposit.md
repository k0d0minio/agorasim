# Stub: The couple can pay the balance from the deposit on, and it is due 24 hours before the event

- feature-slug: balance-payable-from-deposit
- epic: wedding-quotes
- sequence: 3 of 6
- depends-on: none
- complexity: high
- priority: P0

## Problem

The balance is payable only from T-14. Before that the quote page says "O restante é pago a
partir de {date}" and the pay action refuses. The admin card and the emails say "até {date}" for
the same T-14 date, so the two sides contradict each other. The automatic request goes out at
T-14 with one reminder at T-7. There is no way for the team to send the balance request by hand.
Diogo wants: the balance payable as soon as the deposit is paid, due 24 hours before the event,
the automatic link 15 days before, and a manual send from the admin whenever needed.

## Proposed change

The balance instalment becomes payable the moment the deposit is paid. Its due date is the day
before the event. The quote page and every email say one thing: "Por pagar até {day before}",
and "pode pagar já" while the deposit is paid. The daily job sends the balance request 15 days
before the event, and the link in it works at once, as the page already does. The admin quote
card gains "Enviar pedido do restante" to send the request now. The reminder and the T-3 flag
follow the new due date.

## Acceptance criteria

- [ ] After the deposit is paid, the quote page shows the balance "Por pagar até {event day minus 1}" and a working "Pagar restante de {amount}" button, in PT and EN.
- [ ] The admin quote card shows the same due date and never "a partir de".
- [ ] The deposit-received email says the balance can be paid now and is due the day before the event.
- [ ] The daily job sends the balance request 15 days before the event, once, to a quote whose balance is unpaid.
- [ ] "Enviar pedido do restante" on the admin quote card sends the request now and records the send on the card.
- [ ] A payment at T-20 is accepted, takes the 6 % fee, and marks the quote `paid`.
- [ ] The terms say the balance is due the day before the event and may be paid at any time after the deposit.
- [ ] Unit tests cover the window at T-16, T-15, T-1 and the event day.

## Out of scope

- What happens when the balance is unpaid at the deadline (breakdown, out of scope).
- Deposit percentage and the deposit window.

## Notes

- Decisions this stub leaves open. Jamie answers them in the pull request before the build:
  1. Automatic request day. The code says 14, Diogo says 15. Default: 15 days before the event.
  2. The T-7 reminder. Default: keep one reminder, 7 days before, only when the balance is still unpaid.
  3. The deadline. Default: the end of the day before the event, Europe/Lisbon. Payment on the event day is refused and the team is flagged, as today at T-3.
  4. A manual send while the automatic request already went out. Default: allowed. Each send mints a new link and retires the old ones, as today.
- Code: `web/src/lib/quote-math.ts` lines 22 and 30 to 32, `web/src/lib/quotes.ts` lines 118, 167 to 187, 545 to 607, 989 to 998, 1081 to 1091, `web/src/lib/cron/balance-scheduler.ts`, `web/src/lib/balance-schedule.ts`, `web/src/lib/quote-checkout.ts` line 231, `web/src/app/[locale]/orcamento/actions.ts` line 97. Strings: `web/src/content/quote-page.ts` lines 53, 98, 102, 135, `web/src/components/admin/lead-quote-card.tsx` lines 300, 730, 737, `web/src/content/emails.ts` lines 668, 679, 742, 756, 807, 849, `web/src/content/terms.ts` line 178.
- The data-protection register names the balance request and the reminder as contract performance. The new timing changes no lawful basis.
