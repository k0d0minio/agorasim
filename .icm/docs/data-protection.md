# Data protection — the register of open decisions

- status: **draft** — nothing here has been reviewed by counsel
- cited by: `web/src/content/privacy.ts` (header comment and the retention section, both locales), `web/src/lib/retention.ts` (header comment) and `web/src/lib/subject-data.ts` (the export registry)
- history: the original file was deleted at `21d39ea` and is not reachable from this clone's history; recreated 2026-09-10 for the launch-cutover epic (`.icm/intake/launch-cutover/_done/privacy-refresh.md`)

This is the one place the privacy policy's open questions live. The policy on
`/privacidade` carries a **draft banner** (`privacyContent.draftNotice`) until every item
under *Open items* is answered and a human with Portuguese/EU data-protection knowledge has
signed the text off. Nothing in this file is legal advice.

## Processors the site uses (as of 2026-09-10)

| Processor | Role | Personal data it sees | Region / transfer | Where in code |
|---|---|---|---|---|
| Vercel | Hosting, experience photos | Request logs (IP), pages served | TODO(legal): confirm region | `web/` deploy |
| Neon | Postgres — enquiries, bookings, quotes, audit log, message log | Everything the forms collect; booking and quote amounts and Stripe references; the venue and line labels on an event quote; audit IPs | TODO(legal): confirm region | `web/src/db/` |
| Stripe | Payment processing via **Checkout (redirect)** — card data never touches the app | Guest email, line items (experience, date, party), amount, booking id in metadata; for a wedding/event instalment, the couple's email, the instalment ("Sinal — QT-…"), its amount, the quote and instalment ids and the terms version in metadata, and the quote page's return URL (which carries the couple's link token) for the session's hour | Stripe Payments Europe (Ireland) expected for a PT account — TODO(legal): confirm the contracting entity | `web/src/lib/booking-checkout.ts`, `web/src/lib/quote-checkout.ts`, `web/src/lib/stripe.ts` |
| Resend | Email — booking confirmation/cancellation, the day-before reminder (every confirmed booking, online or by phone), enquiry reply, quote sent, deposit-received / balance-paid receipts, the quote-refunded notice (one per refund of a deposit or balance), team copies (all contract or pre-contract, Art. 6(1)(b)); **and the post-tour thank-you** with the Google review link, sent once the morning after a completed booking under the soft opt-in (Art. 6(1)(f) + the existing-customer rule, register D24), with an opt-out link and RFC 8058 `List-Unsubscribe` headers (`web/src/lib/cron/thank-you-review.ts`) | Recipient address, name, booking or quote details in the body | **EU-west (Ireland)** region; US parent → standard contractual clauses as the transfer safeguard | `web/src/lib/email.ts`, `web/src/lib/message-log.ts` |

Money model, as the policy states it: the charge is a **direct charge on the client's own
Stripe account** (`STRIPE_CONNECTED_ACCOUNT_ID`), so Agorasim is merchant of record; the
platform takes an `application_fee_amount` (4% of a tour, 6% of each wedding/event instalment,
`web/src/lib/commission.ts`) that Stripe routes automatically. The platform never receives card data. Until the client's account
exists the session is a plain platform charge on Jamie's sandbox keys — the policy wording
describes the live state, not the sandbox one.

## Open items

1. **Retention window for unconverted enquiries — proposed, unsigned.**
   `DEFAULT_RETENTION_DAYS = 730` (24 months from last contact) in
   `web/src/lib/retention.ts` is a proposal, chosen as common practice for warm sales leads
   in EU tourism. Nobody at Agorasim has signed it off. The policy says so in both locales
   ("PROPOSTA, A CONFIRMAR" / "PROPOSED, NOT YET DECIDED"). Decision needed from Diogo &
   Rita; then set `ENQUIRY_RETENTION_DAYS` and change the policy text in the same PR.
   Related recommendations (not decisions): audit-log IPs 90 days
   (`AUDIT_IP_RETENTION_DAYS`), Resend message ids 90 days
   (`MESSAGE_PROVIDER_ID_RETENTION_DAYS`).
2. **Retention for bookings and events that actually happened.** Excluded from anonymisation
   pending a decision on tax record-keeping periods (the policy carries a `TODO(legal)` for
   this). Needs an accountant's answer on how long invoicing records must be kept. Since
   2026-09-18 the exclusion also covers an enquiry with a `deposit_paid` or `paid` quote
   against it, not only one whose stage reads `booked` — a couple who paid a deposit on a
   wedding is the same obligation, and relying on the stage alone meant relying on it having
   been moved. `web/src/lib/quotes.ts` now moves it (a sent quote → `quoted`, a settled
   deposit → `booked`) and `retention.ts` tests the quote as well; the two are deliberately
   belt and braces.
3. **RNAAT registration number — unanswered.** Blank in the client's info PDF (§1.1). The
   policy's controller block (`controller` in `privacy.ts`) cannot be completed without it,
   and the terms-of-sale page needs it too. Blocks the draft banner.
4. **Liability insurance (provider + policy number) — unanswered.** Same source, same
   blocker. Chase alongside the RNAAT number.
5. **Lawful basis wording.** The policy states Art. 6(1)(b) for enquiries (pre-contractual
   steps) and for bookings — online or taken by phone — (contract performance, which since
   2026-09-24 names the day-before reminder beside the confirmation and cancellation),
   Art. 6(1)(a) for marketing email — with one exception since 2026-09-24: the post-tour
   thank-you with the Google review link goes to every guest of a completed booking under
   the soft opt-in (register D24), stated in the policy as legitimate interest,
   Art. 6(1)(f), plus the existing-customer rule (Lei n.º 41/2004), with an opt-out link in
   every message. Counsel to confirm that wording, and whether the collection-time notice
   the soft opt-in needs should also appear in the booking confirmation email (today it is
   the policy, linked at checkout).
   Counsel to confirm, and to say whether tax obligations attached to paid bookings need
   describing as a separate purpose.
6. **Hosting regions and transfer mechanisms.** Confirm Vercel and Neon regions, the Stripe
   contracting entity, and that Resend's EU region plus SCCs is the right description for
   its US parent. The policy's recipients section carries a `TODO(legal)` for exactly this.
7. **Counsel sign-off → banner off.** When items 1–6 are resolved, remove
   `privacyContent.draftNotice` and every `TODO(legal)` in `privacy.ts`, in one PR, and
   record the reviewer and date here.

## Rules of thumb kept here so they are not re-argued

- `MARKETING_CONSENT_VERSION` moves **only** when `privacyContent.marketing.label` changes.
  Policy edits that leave the opt-in wording alone (like the 2026-09-10 Stripe/Resend
  refresh) do not bump it.
- Adding or removing a processor changes `privacy.ts` (both locales) and this table in the
  same PR.
- Anonymise, don't delete: expired enquiries lose name/email/phone/message and keep the
  statistical shell (`retention.ts`).
- **What an erasure and the sweep reach, and why the list is not obvious.** `tour_requests`
  is the obvious row. Less obvious: `quotes.venue` and the labels on `quotes.line_items` are
  free text an operator typed about somebody's wedding — "Quinta do Hespanhol", "flores da
  Rita" — and a church plus a Saturday in June identifies a couple perfectly well with no
  name attached. Both are cleared by the retention sweep when the enquiry behind them is
  anonymised, and by the Art. 17 erasure **before** it deletes the enquiry: the foreign key
  is `ON DELETE set null`, so anything not taken first is left behind pointing at nobody.
  The amounts, quantities, dates and statuses stay — that is the same "anonymise, don't
  delete" rule, and keeping the line amounts is also what keeps them adding up to the total
  the couple were quoted.
- **The one thing an erasure deliberately keeps: `email_opt_outs`.** The thank-you's
  suppression list holds an HMAC of the address (never the address) and when it opted out.
  It has no foreign key to the enquiry, so neither the retention sweep nor an Art. 17
  erasure touches it — on purpose: keeping the objection is what stops an erased guest who
  books again from being thanked, and keeping only a keyed hash is what makes keeping it
  proportionate. The policy says so in both locales. Opting out also withdraws explicit
  marketing consent on every enquiry with that address (Art. 7(3)).
- **`EMAIL_OPT_OUT_SECRET` is never rotated.** It keys those hashes; a new value makes every
  stored opt-out unmatchable and silently re-subscribes everyone on the list. It is its own
  secret for that reason — `BOOKING_TOKEN_SECRET`'s rotation is its designed emergency
  behaviour. Without it the thank-you job sends nothing (fails closed).
- **The Art. 15 export covers four tables**, not two: `tour_requests`, `message_log`,
  `quotes` and `quote_payments` (`subject-data.ts`) — plus whether the address is on the
  thank-you's opt-out list, and since when (answered by hashing the address asked about). A table that stores or describes a
  person and is not in that registry makes every future export quietly wrong, so it is
  extended in the same PR that adds the table.
