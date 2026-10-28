# Stub: The team creates a payment link from scratch, for a personalised tour or wedding with no enquiry

- feature-slug: payment-link-from-scratch
- epic: bookings-and-payment-links
- sequence: 2 of 3
- depends-on: team-booking-paid-by-link
- complexity: high
- priority: P1

## Problem

A quote can only be raised from a wedding or event enquiry on the Sales board. Diogo: "How can we
create custom payment links for fully personalized tours and weddings? Perhaps we could add a
button in the Sales section that allows us to create these payment links from scratch with all
details." Feature 6 of the proposal is custom payment links for one-off quotes, deposits and
balances.

## Proposed change

"Novo" on the Sales board opens a form: customer name, email, language, kind (tour or wedding or
event), date, and the quote lines. It creates the lead and the quote draft in one step. The quote
then follows the existing path: send, the token-gated page, the payment, the emails. A tour quote
takes the 4 % tour fee and is paid in one payment. A wedding or event quote takes the 6 % fee
with deposit and balance, as today.

## Acceptance criteria

- [ ] `/admin/sales` shows "Novo" and opens the form.
- [ ] Submitting creates a lead in "Orçamentado" and a quote draft attached to it.
- [ ] A tour quote has one payment, the 4 % fee with the €10 floor and €50 cap, and no event hold.
- [ ] A wedding or event quote has deposit and balance, the 6 % fee, and the event hold from the deposit, as today.
- [ ] The customer's quote page shows the customer's name and the lines, in the chosen language.
- [ ] The send, resend, new version, refund and balance flows work on the new quote without change.

## Out of scope

- Quotes with no customer email. The page and the emails need a recipient.
- A standalone Stripe Payment Link object (register D25: the page mints the session on tap).

## Notes

- Decisions this stub leaves open. Jamie answers them in the pull request before the build:
  1. Does a tour quote hold a car on the date? Default: no, like a link booking (stub 1). A personalised tour is coordinated by hand.
  2. Does a tour quote allow a deposit? Default: no. One payment.
- Today: `quotes.tourRequestId` is nullable (`web/src/db/schema.ts` line 1490) but `quoteDraftSchema` requires a lead (`web/src/lib/form-schemas.ts` line 739), `createDraftForLead` needs a wedding or event lead (`web/src/lib/quote-builder.ts` lines 126 to 138), `isQuotable` refuses tours (line 100), the fee is hardcoded to the event rate (`web/src/lib/quote-checkout.ts` line 282), and a deposit-paid quote takes the whole day (`web/src/lib/event-holds.ts` line 40). The simplest route creates a `tour_requests` row the way `createManualBooking` does (`web/src/app/admin/calendar/actions.ts` lines 471 to 486).
