# Tasks: quote-page-and-deposit-link

The queue, with a definition of done per item. Ticked by the stage that finishes the item —
a human checkbox, never a script's. The definition of done is seeded from the spec's
acceptance criteria when the run is opened; the queue is Build's own, one line per commit-sized
step, so a resuming session can pick up the first unticked line.

## Definition of done

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

## Queue

- [x] Terms amendment + `message_log_quote_receipt_key` migration + receipt subject type (1e5e440)
- [x] `dueInstalment`, session compare-and-set, accepted-terms stamp in `lib/quotes.ts` (095486a)
- [x] `lib/quote-checkout.ts`: mint, recording, receipts; webhook quote branch (095486a)
- [x] Receipt emails; quote page + action + pay form; booking bar (095486a)
- [x] Return-path reconciliation moved into `quote-checkout.ts` and tested; `termsSection` test
- [ ] Cheap-tier GREEN → merge `origin/main` + `origin/uat` → flip ready → full GREEN
