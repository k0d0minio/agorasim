# Spec: The couple's quote page — the terms in front of them, the deposit paid on tap, the 6% on the instalment

- slug: quote-page-and-deposit-link
- personas: guest, operator
- touches: web/src/app/[locale]/orcamento, web/src/app/api/stripe/webhook, web/src/lib/quotes.ts, web/src/lib/quote-token.ts, web/src/lib/quote-builder.ts, web/src/lib/booking-emails.ts, web/src/lib/message-log.ts, web/src/lib/stripe.ts, web/src/lib/commission.ts, web/src/db/schema.ts, web/drizzle, web/src/content/terms.ts, web/src/components/booking-bar.tsx, web/src/app/[locale]/layout.tsx
- complexity: complex

## Problem

The quote builder (#120) emails a couple a `/<locale>/orcamento/<token>` link that 404s: there
is no quote page, no way to pay, and the webhook hands every paid Checkout session to
`confirmPaidBooking`, so a paid deposit would alert "matches no booking" and never be recorded.
The couple would also pay without seeing the deposit, balance and withdrawal terms that
DL 24/2014 arts. 4(1) and 17(1)(l) require before payment and on a durable medium after it.
This completes the paying half of contracted feature ⑥ (proposal §5: a 30% deposit holds the
date, the balance is due 14 days before, 6% on each payment). D25 fixes the mechanism: a
token-gated page that mints the Checkout session on tap, with no long-lived Payment Links.

## Proposed change

**1. The terms, amended once (terms.ts, PT + EN).** The "Casamentos e eventos" / "Weddings
and events" section gains two statements, in place of "the balance is paid on the conditions
set out in the quote":
- the balance is paid by a payment link sent 14 days before the event;
- the 14-day right of withdrawal does not apply to a wedding or event booked for a specific
  date (Directive 2011/83/EU art. 16(l); DL 24/2014 art. 17(1)(l)).

The deposit wording stays as it is (30%, non-refundable within 30 days of the event, free date
change subject to availability; D9). The `[LAWYER]` "sinal" question stays open and is cited
in a code comment, not in the copy. No "we cancel" rule for events is added. The terms'
default is to state only what the terms already state, so that rule stays `[LAWYER]`.
`TERMS_VERSION` moves to the day this ships, and the "last updated" date moves with it.

**2. The page `/[locale]/orcamento/[token]`.** It is public, `noindex, nofollow`, out of the
sitemap and has no hreflang alternates. It is `force-dynamic`, like `/reservar/confirmacao`:
the page is per-guest and never cached. It hashes the path token with `quoteTokenDigest` and
reads `getQuoteByAccessTokenHash`. It renders in the URL's locale, and the link the builder
emails uses the quote's own locale.
- **Unknown, superseded or cancelled token:** one neutral page, "this link is no longer
  valid", with Diogo's, Rita's and info@ contacts. It gives no hint whether the quote ever
  existed and returns an HTTP 404 status. A malformed token (`looksLikeQuoteToken` false) is
  refused without hashing.
- **A live quote** (`sent`, `deposit_paid`, `paid`) shows the quote ref, event date, venue,
  each line (label, quantity, unit price, line total), the total, the deposit (percent and
  amount), the balance and its due date (event date − 14), and each instalment's state.
- **The terms before payment.** The page renders the amended "Casamentos e eventos" section
  verbatim from `terms.ts`, the seller block (`seller`, with the RNAAT placeholder while it is
  `null`), the "Reclamações e lei aplicável" section, and a link to the full terms. The terms
  version and date are shown beside them. The page renders the content object itself, so it
  cannot drift from it.
- **One pay button, for the instalment that is due:** the deposit while it is unpaid, then the
  balance once today (Europe/Lisbon) is on or after its `due_date`. Between the two, the page
  says when the balance falls due and that a link will be sent. A quote whose balance is `0`
  has no balance row and no second button. The label states the amount ("Pagar sinal de
  €X" / "Pay €X deposit").
- **After payment** (`deposit_paid` / `paid`), the page is the receipt: what was paid and
  when, what is still owed and by when, and the terms version accepted. When the couple
  returns from Checkout before the webhook has landed, the page shows "a confirmar o
  pagamento" / "confirming your payment" instead of the button (see 4).

**3. Minting the session on tap (a server action, never on page load).**
- The session is a Checkout session in `payment` mode, in EUR, for the due instalment's
  amount. There is one line, named for the instalment and the quote ref ("Sinal — orçamento
  Q-…").
- With Connect configured, the session is a direct charge on the connected account
  (`onConnectedAccount()`) with `payment_intent_data.application_fee_amount =
  commissionOn("event", instalmentCents).feeCents`. Without Connect it is platform-only and
  carries no fee, as the tour checkout does today.
- It carries `customer_email` (the lead's email), `client_reference_id` = the payment id, and
  metadata `{ quoteId, paymentId, kind, ref, termsVersion }` on the session and on the payment
  intent. `termsVersion` is the `TERMS_VERSION` the page showed when the couple tapped.
- The Checkout locale is the page's locale. `success_url` is the quote page with
  `?session_id={CHECKOUT_SESSION_ID}` and `cancel_url` is the quote page. The session expires
  after a short window (Build picks it, within Stripe's 30 min – 24 h).
- The row is recorded with `markPaymentIssued` on the first tap and `reissuePayment` after
  that, with the commission rate in bps.
- **Re-mint, never double-pay.** If the row's current session is still `open`, the tap
  reuses its URL. If that session has expired, the tap mints a new one. If it is
  `complete`, whether paid or waiting on a delayed method such as Multibanco, the tap mints
  nothing and the page shows the confirming or awaiting state. Before a new session replaces
  an open one, the old one is expired at Stripe, so no two payable sessions ever exist for
  one instalment. Concurrent taps must not leave two open sessions.
- It refuses to mint when the quote is not live, the instalment is not the due one, the
  instalment is already `paid` or `cancelled`, or Stripe is not configured. Each refusal is a
  plain message on the page, never a 500.

**4. Recording the payment.**
- **Webhook.** For `checkout.session.completed` and `async_payment_succeeded` with a paid
  status, `getPaymentBySessionId` is checked before `confirmPaidBooking`. A quote session
  goes to `markPaymentPaid` with Stripe's own settlement: payment intent, charge, connected
  account, `application_fee_amount` read back from the charge, and the rate in bps. A
  mismatch against `commissionOn("event", …)` is logged, as the tour audit does, and Stripe's
  figure is recorded. `markPaymentPaid` already moves the quote (`deposit_paid` / `paid`) and
  the lead to `booked` (stub 1). A repeat delivery (`null`) is success, not an alert.
- **Session events.** `checkout.session.expired` or failed for a quote session does not touch
  `bookings` and does not alert. The instalment stays `issued`, and the next tap re-mints.
  The tour path (`confirmPaidBooking`, `closeUnpaidBooking`, refunds) is unchanged for every
  session that is not a quote's.
- **The return path records too.** When the page receives `?session_id=`, it confirms the
  session belongs to this quote's instalment. If Stripe says it is paid, it runs the same
  idempotent recording as the webhook, so whichever arrives first records the payment and
  sends the messages, once. A `session_id` that is not this quote's is ignored.
- **Terms accepted = terms shown.** The deposit's recorded `acceptedTermsVersion` is the
  `termsVersion` from the paid session's metadata: the version on the page when the couple
  tapped. It falls back to the quote's `termsVersion` only when the metadata is absent. The
  version stamped at send stays as it was.

**5. The messages, each logged exactly once per instalment in `message_log`.**
- **To the couple** (`deposit-received` / `balance-paid`), in the quote's language: what was
  paid and when, the quote ref, event date and venue, what is still owed and its due date
  (deposit) or "fully paid" (balance), the link back to the quote page, and — as the durable
  medium — the amended "Casamentos e eventos" section **verbatim with its terms version**,
  plus a link to the full terms.
- **To the team** (same kinds, recipient `team`), in Portuguese: quote ref, couple, event
  date, instalment, amount and fee.
- The uniqueness key is the quote and the instalment kind: a second webhook delivery, the
  return path racing the webhook, or a double tap never sends twice, and a failed send can be
  retried. This is a new partial unique index on `message_log` (a migration), in the shape
  `message-log.ts`'s note reserves for these kinds. The rows stay inside the lead's cascade
  erasure and the Art. 15 export.

**6. The booking bar.** On `/casamentos` and `/eventos` the phone-only bar points at that
page's `#orcamento` form, labelled "Pedir orçamento" / "Request a quote". On
`/orcamento/[token]` it is hidden. It is unchanged everywhere else.

## Acceptance criteria

- [ ] A couple opens their emailed link days after it was sent, reads the quote and the terms, taps "Pagar sinal", and completes Checkout. With Connect configured, the session and charge are on the connected account with an application fee of `commissionOn("event", deposit)`. The deposit row is `paid`, with its payment intent, charge, account, fee and rate recorded, the quote is `deposit_paid`, and the lead is `booked`
- [ ] The couple and the team each get the deposit-received email exactly once, even when the return page and the webhook both see the payment, and across repeated webhook deliveries
- [ ] The page shows the quote ref, event date, venue, lines, total, deposit, balance with its due date (event date − 14) and each instalment's state, in PT at `/pt/…` and EN at `/en/…`
- [ ] The terms on the page render the `terms.ts` "Casamentos e eventos" section verbatim, including the new balance-by-link and no-withdrawal statements, plus the seller block, the complaints and law section, and a link to the full terms. `TERMS_VERSION` and the "last updated" date move together
- [ ] The deposit-received and balance-paid emails carry that section verbatim with its version (durable medium). The paid deposit's `acceptedTermsVersion` equals the version the page showed at the tap, even when it differs from the version stamped at send
- [ ] An expired session is replaced by a new one on the next tap. An open session is reused, not duplicated. A replaced open session is expired at Stripe first. A session that is complete but awaiting a delayed payment method mints nothing, and the page shows the awaiting state
- [ ] After the deposit, the page is a receipt with no pay button until the balance's due date. From that date it offers "Pagar saldo", and paying it moves the quote to `paid` and sends balance-paid once to the couple and once to the team
- [ ] A superseded, cancelled, unknown or malformed token shows the neutral "no longer valid" page with contacts and a 404 status. The page is `noindex`, absent from the sitemap, and never cached
- [ ] Minting is refused with a plain message, not a 500, for a quote that is not live, an instalment that is not due, or a paid or cancelled instalment. A tour session's paid, expired and refund paths behave exactly as before, and a quote session never reaches `confirmPaidBooking` or raises the unknown-session alert
- [ ] On `/casamentos` and `/eventos` the phone booking bar scrolls to `#orcamento` and reads "Pedir orçamento" / "Request a quote". It is absent on the quote page and unchanged elsewhere
- [ ] Unit tests cover the mint (due-instalment choice, fee, reuse/expire/re-mint, refusals), the webhook quote branch (paid, repeat, expired, tour path untouched), the return-path recording, the accepted-terms stamp, and the messages' once-only key and content in PT and EN. CI is green

## Out of scope

- Refunds of quote instalments and the pro-rata fee return (stub 4, `quote-refunds`); capacity holds (stub 5); issuing and emailing the balance link at T−14 and any chaser (stub 6). This stub only makes the balance payable from the page once it is due.
- Paying the balance early, before its due date — not in the proposal's terms (balance 14 days before), so not offered.
- An our-side cancellation rule for events and any change to the "sinal" wording — `[LAWYER]`, open in the register.
- Keeping historical terms text per version. The page and the emails render the current text, and the stamp records which version was accepted.
- Stored payment methods or off-session charges (breakdown).
- A Sales-board change beyond what `markPaymentPaid` already does (the lead moves to `booked`; the admin quote card already shows instalment states).

## Open questions

- none. Settled with the operator 2026-09-24: amend `terms.ts`'s events section, stamp the terms version shown at the tap, full events terms in the receipt emails, the booking bar points at `#orcamento`, team email on each paid instalment, neutral dead-link page. The stub's open point (the "we cancel" rule) keeps its default: state what the terms state, no more.

Context budget: `quotes.ts` (payments, lead move), `quote-token.ts`, `message-log.ts` kinds, the webhook's paid branch, `booking-checkout.ts`'s session creation, `terms.ts` headings and `booking-bar.tsx` were read to settle the mint, the webhook ordering and the terms questions. This goes past the Inputs table and is recorded here.
