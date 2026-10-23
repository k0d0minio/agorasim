# Breakdown: Team bookings paid by link, payment links from scratch, one driver off

- epic-slug: bookings-and-payment-links
- source: feedback round 1, Diogo, WhatsApp 2026-10-12 (Drive, `feedback-round-1.pdf`), items "Marta Silva", "Joana Ferreira", "Diogo in doctor", "Vendas-Novo-Marta Silva" and "custom payment links". Proposal of 2026-07-23, feature 6 "Custom payment links".

## What I understood

When the team registers a booking from a tour request today, the booking is born confirmed and
paid, by cash, with no email. Diogo wants two paths: "Pagar em dinheiro" for a sale made in
person, and "Enviar link de pagamento" for a request that the customer pays online, with the
booking confirmed only when the payment lands. Guests never see a cash option, and that stays.
Dates are not held without payment: a pending link holds no car. Diogo also wants to create a
payment link from scratch, for a personalised tour or wedding with no enquiry behind it. The
database allows a quote with no enquiry, but every screen and send path requires one, and the
builder refuses tours. Last, when one driver is away the team can only block a morning, an
afternoon or a day. The driver stepper under "Mais opções" lowers both departures of a day to
one driver, but Diogo did not find it, and it cannot take one departure to one driver.

## Build order

1. team-booking-paid-by-link — the team picks cash or a payment link when registering a booking, and a link confirms the booking on payment — depends-on: none
2. payment-link-from-scratch — "Novo" on the Sales board creates a quote with no enquiry, for a tour or an event — depends-on: team-booking-paid-by-link
3. one-driver-off-per-departure — the day panel offers "Só um condutor" for the day, the morning or the afternoon — depends-on: none

## Out of scope

- Holds without payment. Already true: a pending checkout holds a car for 30 minutes, a quote holds the day from the deposit, nothing else holds anything.
- A guest-side cash option. Already true: `/reservar` is Stripe only.
- A money view or commission totals in the admin (register D22, parked).
