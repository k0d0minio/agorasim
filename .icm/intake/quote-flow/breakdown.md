# Breakdown: Quote flow — the weddings and events money, on the schema that already exists

- scope-slug: quote-flow · story: none — re-cut by `/project` 2026-09-18 from the purged epic of the same name (`git log -- .icm/intake/quote-flow`, cut 2026-08-29, purged 2026-09-11)
- initiative: contracted feature ⑥ complete after launch / objective: a couple pays a 30% deposit from a quote Rita sent, the balance is collected 14 days before, the 6% lands on each payment
- personas: team, guest, operator
- sources: proposal feature ⑥ and §5 (30% deposit via payment link, balance 14 days before, 6% proportional); the commission agreement §5; info PDF §2.3 (quote per event, 3–4 months ahead); D9 (30-day non-refund default, [LAWYER]), D10/D20 (two doors, quoting by hand meanwhile), D25 (the quote page mints the payment); 2026-09-18 product, data and legal lenses — evidence on each stub; `web/src/lib/quotes.ts` (#78) and `web/drizzle/0022_quotes_and_payments.sql`

## What I understood

Weddings and events are the 6% side of the business and both doors are open since #101:
an enquiry lands on the Sales board with the event date, venue and party. Everything after
that is by hand today, although the schema and the state machine for a quote and its two
instalments shipped in #78 — `createQuote`, `markQuoteSent`, `markPaymentIssued/Paid`,
`listQuotesDueForBalance`, `balanceDueDate` at T−14, `splitTotal` at 30%, and the 6%
rate in `commission.ts` — and nothing calls any of it. The webhook and the refund
reconciler resolve Stripe sessions to `bookings` only, so a deposit paid today would
alert "matches no booking" and go unrecorded. The couple reaches the payment through a
token-gated quote page that shows the quote and the terms and creates the Checkout
session on tap (D25); the balance is a second session the dispatcher issues at T−14. A
deposit-paid event must take capacity from the drivers-and-cars pool — how much is the
client's answer. Refunds of quote payments and the pro-rata fee return have no path yet,
and the live terms already promise one.

## Where it sits

The enquiry → quote → deposit → balance journey: `tour_requests` (kind wedding/event) →
`quotes` + `quote_payments` → Stripe Checkout on the connected account → `message_log` →
the Calendar's capacity. Pages: the register's Business logic → Weddings/events and
Money; `.icm/docs/data-protection.md` (stub 1 changes what the erasure covers); the
commission agreement PDF for the fee wording; the terms content object for what the
guest is told.

## Build order

1. quote-data-hygiene — message kinds for the flow; venue and line items inside erasure and the export; a paid lead moves to booked; a transfer-paid deposit does not strand the scheduler — depends-on: none
2. admin-quote-builder — Rita turns a wedding or event enquiry into a priced, sent quote — depends-on: quote-data-hygiene
3. quote-page-and-deposit-link — the token-gated quote page states the terms and mints the Checkout session; the webhook books the instalment with the 6% fee — depends-on: admin-quote-builder
4. quote-refunds — refunding an instalment from the admin or the Stripe dashboard reaches the books, fee returned pro-rata — depends-on: quote-page-and-deposit-link
5. event-holds-capacity — a deposit-paid event draws on the pool — depends-on: quote-page-and-deposit-link
6. balance-scheduler — the T−14 balance session and its chaser, on the dispatcher — depends-on: quote-page-and-deposit-link

## Parallelizable

4, 5 and 6 each rest on 3 only; 5 is blocked on the client's capacity answer and can be
walked last without holding 4 or 6.

## Out of scope (whole scope)

- Gift vouchers (D13) and any package or tier pricing — quotes are bespoke by design
  ("quote per event depending on location", the client's words).
- Event-day reminder and post-event thank-you for weddings — the lifecycle epic's
  question, not this one's.
- An our-side cancellation rule for events and the "sinal" wording — `[LAWYER]`; the
  terms carry today's default (D9) until answered.
- Stored payment methods or off-session charges — the balance is a fresh session by
  design, so no PSD2 mandate work.
