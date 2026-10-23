# Stub: The team registers a booking as paid in cash, or sends a payment link and the booking confirms on payment

- feature-slug: team-booking-paid-by-link
- epic: bookings-and-payment-links
- sequence: 1 of 3
- depends-on: none
- complexity: high
- priority: P0

## Problem

"Registar reserva" on a tour request writes a booking that is confirmed and paid at once, by
cash, and moves the request to "Reservado". Diogo: "as soon as I register the booking, it
automatically appears as paid, even though the customer hasn't made any payment. The booking
should only be confirmed and registered once the payment has been made." He wants a button to
send the customer a payment link, like weddings have, and "Pagar em dinheiro" to stay a team-only
choice.

## Proposed change

The register dialog asks how the customer pays. **Pagar em dinheiro**: the booking is confirmed
and paid now, as today. **Enviar link de pagamento**: the customer receives an email with a link
to a page that shows the booking and takes the payment. The booking stays "Pagamento pendente"
and holds no car until the payment lands. On payment the booking confirms, the car is assigned,
the confirmation email goes out, and the request moves to "Reservado". The team can resend the
link. Guests on `/reservar` never see a cash option.

## Acceptance criteria

- [ ] The register dialog offers "Pagar em dinheiro" and "Enviar link de pagamento". Cash behaves as today.
- [ ] A link booking shows "Pagamento pendente" on the Sales board and the lead page, holds no car, and the request stays in its stage.
- [ ] The customer receives an email with a link to a page that shows the tour, date, departure, party, add-ons and total, and pays there with the embedded Stripe form.
- [ ] On payment the booking becomes "Paga", the car is assigned, both confirmation emails go out, the 4 % fee is taken, and the request moves to "Reservado".
- [ ] When the departure is full at payment time, the payment is refused and the page says so.
- [ ] The team can resend the link from the lead page.
- [ ] `/reservar` offers no cash option.

## Out of scope

- A payment link with no enquiry behind it (stub 2).
- Partial payments or deposits on tours.

## Notes

- Decisions this stub leaves open. Jamie answers them in the pull request before the build:
  1. Does a pending link hold the car? Default: no. "Dates are not held without payment" (Diogo, 2026-10-12). The payment is refused when the departure fills first.
  2. How long is the link valid? Default: until the departure is past. No expiry email.
  3. Add-ons on a team booking. The dialog has none today and prices with none. Default: the dialog gains the tour's add-ons, so the link shows the full total.
- Today: `createManualBooking` in `web/src/app/admin/calendar/actions.ts` lines 302 to 577 writes `status: "confirmed"`, `paymentMethod: "cash"` at lines 510 to 516. `paymentMethodEnum` is `["stripe", "cash"]` at `web/src/db/schema.ts` line 196. The public hold is 30 minutes and equals the Stripe session expiry (`web/src/lib/booking-checkout.ts` line 315), so the link needs its own page that mints the session on tap, like the quote page (`web/src/lib/quote-checkout.ts`).
- Strings today: "Registar reserva", "Registar e confirmar", "Reserva registada e confirmada.", "Paga", "Pagamento pendente", "Pago". The glossary in `.icm/docs/admin-pt-inventory.md` defines *reserva* as a *pedido* that is paid and confirmed.
