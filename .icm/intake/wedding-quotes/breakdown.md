# Breakdown: Wedding quotes, the way Agorasim sells a wedding

- epic-slug: wedding-quotes
- source: feedback round 1, Diogo, WhatsApp 2026-10-12 (Drive, `feedback-round-1.pdf`), items on wedding quotes (18:13 to 18:19), "Wedding Booking Form" and "Wedding Service Hours".

## What I understood

The wedding flow works end to end: enquiry form, admin quote builder, token-gated quote page,
deposit, balance at T-14, refunds. Diogo tested it as a couple and as the team and found six
things wrong. The balance is the big one: the guest page says the balance "é pago a partir de"
T-14, the admin and the emails say "até" the same date, and the couple cannot pay before T-14.
Diogo wants the balance payable the moment the deposit is paid, due 24 hours before the event,
with the automatic link 15 days before and a manual send from the admin at any time. The pay
button sits under all the terms, so the deposit looks like the last step. The quote page shows a
"Quem vende" block with Diogo's legal name, tax number, address and both phones. The lead page
shows the tours' experience and extras pickers on a wedding lead. The wedding form asks the
number of guests, which Diogo does not need, and asks "Horas de serviço" when Agorasim charges
per event and needs the ceremony time instead.

## Build order

1. wedding-form-without-guest-count — the wedding form stops asking the number of guests — depends-on: none
2. ceremony-time-instead-of-service-hours — the wedding form asks the ceremony time, not hours of service — depends-on: wedding-form-without-guest-count
3. balance-payable-from-deposit — the couple can pay the balance from the deposit on, due 24 hours before, link at T-15, manual send — depends-on: none
4. deposit-button-first-on-quote-page — the deposit button sits under the quote, before the terms — depends-on: balance-payable-from-deposit
5. quote-page-without-seller-block — the "Quem vende" block leaves the quote page — depends-on: deposit-button-first-on-quote-page
6. wedding-lead-without-tour-extras — the lead page hides the tour experience and extras pickers on wedding and event leads — depends-on: none

## Out of scope

- Payment links for tours and quotes with no enquiry (epic `bookings-and-payment-links`).
- The deposit window and the legal wording of the "sinal" (counsel, register open questions).
- What happens to a date when the balance is unpaid at the deadline. Today the admin flags it at T-3. The rule stays until Jamie and the client decide it.
