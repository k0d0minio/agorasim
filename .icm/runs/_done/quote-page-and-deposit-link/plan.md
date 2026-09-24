# Plan: quote-page-and-deposit-link

Build's execution plan in passes — each pass one layer of the change, in the order it lands, so
a session that resumes mid-build sees where it is. Written by the advisor pass (Define, or
Build's first act on `sonnet` after reading the spec), executed pass by pass, and rewritten when
reality disagrees with it — never left describing a plan that was abandoned.

## Passes

1. **Terms and message key** — `web/src/content/terms.ts` (events section: balance-by-link +
   no-withdrawal lines, PT+EN; `TERMS_VERSION` and "last updated" moved together);
   `web/src/db/schema.ts` + a new `web/drizzle` migration: a partial unique index on
   `message_log (kind, recipient, quote_id)` for `deposit-received` / `balance-paid` (no
   `quote_sent_at`), and a matching `MessageSubject` arm in `web/src/lib/message-log.ts` —
   done when: the migration applies on the run's DB branch (`check-migrations.sh`), and
   `sendLoggedEmail` refuses a second deposit-received for the same quote and recipient in a
   test.
2. **Domain: the due instalment and the accepted-terms stamp** — `web/src/lib/quotes.ts`: a
   pure "which instalment is due today (Europe/Lisbon)" helper; `markPaymentPaid` taking an
   optional accepted terms version (the session's metadata) that wins over the send-time
   stamp — done when: unit tests cover deposit-first, balance-on-or-after-due-date,
   balance-zero, paid/cancelled, and the stamp.
3. **The mint** — a new `web/src/lib/quote-checkout.ts` (beside `booking-checkout.ts`,
   reusing `stripe.ts`'s `onConnectedAccount` / `onOwningAccount` and `commissionOn("event", …)`):
   reuse an open session, expire-then-replace, refuse on complete/awaiting, the refusals;
   `markPaymentIssued` / `reissuePayment`; concurrency guarded on the row — done when: tests
   with a mocked Stripe cover each branch and assert the fee and the metadata.
4. **Recording** — the quote branch in `web/src/app/api/stripe/webhook/route.ts` before
   `confirmPaidBooking` (paid, async-succeeded, expired/failed no-op) and one shared
   `recordQuotePayment(session)` used by the webhook and the page's return path: the Stripe
   settlement read back, `markPaymentPaid`, then the guest + team emails through
   `sendLoggedEmail` — done when: tests show a repeat delivery and a webhook/return race each
   send once, and a tour session still takes the old path untouched.
5. **The emails** — deposit-received / balance-paid for the couple (quote's locale, the events
   terms section verbatim + version, the quote link) and the team (PT) in
   `web/src/lib/booking-emails.ts` (or beside the quote-sent email in `quote-builder.ts`, where
   it lives) — done when: content tests in PT and EN pass.
6. **The page** — `web/src/app/[locale]/orcamento/[token]/page.tsx` (+ its server action,
   `force-dynamic`, `noindex`, no sitemap/hreflang): the quote, the terms from `terms.ts`, the
   one due button, the receipt / confirming / awaiting states, the neutral dead-link page with
   a 404 status — done when: the page renders each state against a seeded quote on the
   preview.
7. **The booking bar** — `web/src/components/booking-bar.tsx` (+ the label passed from
   `web/src/app/[locale]/layout.tsx`): `#orcamento` with "Pedir orçamento" / "Request a quote"
   on `/casamentos` and `/eventos`, hidden on `/orcamento/*` — done when: a component test
   covers the three pathname cases.

## Risks

- Two payable sessions for one instalment (double tap, reuse race) — the signal is a second
  `checkout.session.completed` whose session is not the row's `stripe_session_id` → the
  unknown-session alert. Guard the mint on the row (conditional update on the previous
  session id) and expire the old session before writing the new one.
- The webhook's quote lookup running after `confirmPaidBooking` would alert on every deposit —
  the order is the point; a test pins it.
- `TERMS_VERSION` moving marks the `admin-quote-builder` UAT test quotes as sent under an older
  version — expected; the stamp-what-was-shown rule covers it.
- Connect unset on previews — the mint must still work platform-only with no fee (tour
  precedent), or the preview smoke cannot pay.
