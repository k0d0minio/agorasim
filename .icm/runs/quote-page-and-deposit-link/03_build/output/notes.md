# Build notes: quote-page-and-deposit-link

- commits: 1e5e440 (terms + receipt index), 095486a (page, mint, webhook, receipts, bar), then the return-path extraction and CI fixes that follow
- ci: cheap tier GREEN on 095486a and f6808ae; full gate — see `status.md`

## What changed

- `web/src/content/terms.ts`: the events section gains the balance-by-link and the no-withdrawal statements (PT + EN); `TERMS_VERSION` and "last updated" move to 2026-09-24; sections carry an optional `id`, and `termsSection("events" | "complaints", locale)` is how the page and the receipts quote them verbatim.
- `web/src/db/schema.ts` + `web/drizzle/0028_quote_receipt_per_quote.sql`: `message_log_quote_receipt_key`, a partial unique index on `(kind, recipient, quote_id)` where `quote_sent_at is null` — one `deposit-received` / `balance-paid` per quote per recipient. Applied to the run's Neon branch with `drizzle-kit migrate`.
- `web/src/lib/message-log.ts`: `QUOTE_RECEIPT_KINDS` and their `MessageSubject` arm (quote id, no send stamp).
- `web/src/lib/quotes.ts`: `dueInstalment` (the pure rule: deposit first, balance from its due day in Lisbon, settled / not-live); `markPaymentIssued` only lands on a row with no session; `reissuePayment` takes `replacing` (compare-and-set on the session it replaces) and the commission rate; `markPaymentPaid` takes `acceptedTermsVersion` from the paid session's metadata; `getPayment` by id.
- `web/src/lib/quote-checkout.ts` (new): the mint (`startQuoteCheckout` — reuse an open session under today's terms, expire-then-replace an open one under older terms, replace an expired one, mint nothing for a completed one, lose a race by expiring its own and taking the winner's), the recording shared by the webhook and the return page (`recordQuotePayment`, `reconcileQuoteReturn`), the settlement read back from the charge, the receipts to the couple and the team, and the alarms (no instalment; money on a written-off instalment).
- `web/src/app/api/stripe/webhook/route.ts`: quote sessions (by metadata) branch off before `confirmPaidBooking` and before `closeUnpaidBooking`; tour and refund paths untouched.
- `web/src/app/[locale]/orcamento/[token]/page.tsx` + `actions.ts` + `web/src/components/quote-pay-form.tsx` + `web/src/content/quote-page.ts`: the page — quote, payments, the events terms, seller, complaints, full-terms link, one pay button or the not-yet / confirming / awaiting notice, the neutral dead-link panel; `force-dynamic`, `noindex`, throttled lookup and throttled taps.
- `web/src/components/terms-of-sale.tsx`: the seller block extracted as `SellerDetails` so the quote page shows the same one.
- `web/src/lib/booking-emails.ts` + `web/src/content/emails.ts`: `guestQuoteReceiptEmail` (PT/EN, events terms verbatim with the version, link to the full terms) and `teamQuoteReceiptEmail` (PT, with the fee).
- `web/src/lib/booking-bar-target.ts` + `web/src/components/booking-bar.tsx` + layout + dictionaries: `#orcamento` / "Pedir orçamento" on `/casamentos` and `/eventos`, hidden on `/orcamento/*`.
- `web/src/lib/rate-limit.ts`: `QUOTE_LOOKUP_RATE_LIMIT` (20/10 min), `QUOTE_PAY_RATE_LIMIT` (10/10 min).

## Acceptance criteria status

- [x] Link opened days later → terms → pay → Checkout on the connected account with `commissionOn("event", deposit)`; deposit `paid` with intent, charge, account, fee, rate; quote `deposit_paid`; lead `booked` — `startQuoteCheckout` + `recordQuotePayment` → `markPaymentPaid` (the lead move is stub 1's, already in `syncQuoteAfterPaymentChange`). Needs the preview smoke with a sandbox card.
- [x] Deposit-received once to the couple and once to the team across redeliveries and the return-page race — the new partial unique index + receipts attempted whenever the instalment is paid (`quote-checkout.test.ts`, `message-log.test.ts`).
- [x] The page shows ref, date, venue, lines, total, deposit, balance with its due date, and each instalment's state, PT and EN.
- [x] Terms on the page are `terms.ts`'s events section verbatim (with the two new statements), seller block, complaints section, full-terms link; `TERMS_VERSION` and "last updated" moved together (`terms.test.ts` still binds them).
- [x] Receipts carry the events section verbatim with its version; `acceptedTermsVersion` is the version in the paid session's metadata (the page's at the tap) — `quote-writes.test.ts`, `quote-checkout.test.ts`.
- [x] Expired → replaced; open → reused; open under older terms → expired first; complete-awaiting → nothing minted, awaiting shown.
- [x] After the deposit the page is a receipt with the not-yet notice until the due day; from it, "Pagar restante"; paying moves the quote to `paid` and sends balance-paid once each.
- [ ] Dead link → the neutral panel with contacts, `noindex`, not in the sitemap, never cached — **but a 200 status, not a 404** (RD-9: the locale's `loading.tsx` streams the route, so the status is sent before the lookup finishes; a real 404 needs the lookup in `proxy.ts`).
- [x] Refusals are sentences, never a 500; the tour paid / expired / refund paths are unchanged; a quote session never reaches `confirmPaidBooking` or the unknown-session alarm (`route.quote.test.ts`).
- [x] Booking bar: `#orcamento` + "Pedir orçamento" / "Request a quote" on the two pages, hidden on the quote page, unchanged elsewhere (`booking-bar-target.test.ts`).
- [x] Unit tests for the mint, the webhook branch, the return-path recording, the terms stamp, and the receipts' once-only key and PT/EN content. CI verdict in `status.md`.

## Notes for Release

- **Two spec gaps decided at Build** (`decisions.md` RD-8, RD-9): the receipts carry no quote-page link (the webhook never holds the token; the operator chose this in session), and the dead-link page is a `noindex` 200, not a 404.
- **The balance and stub 6.** A tap on "Pagar restante" on the due day marks the balance `issued` with its own session before the T−14 job has run; `balance-scheduler` must not read `issued` / `issued_at` alone as "the link was emailed" — it should key its email on the message log's `balance-request` row instead.
- **Refunds of quote instalments** still reach `syncRefundFromStripe`, which finds no booking and raises "Refunded Stripe charge matches no booking" — expected until `quote-refunds` (stub 4).
- **The migration** (`0028`) reaches the preview and UAT databases through the Vercel build's migrate step, and production after the promotion (`migrate` on `main`).
- **Stripe return URLs hold the token.** `success_url` / `cancel_url` are the quote page, so Stripe (already the payment processor) holds the link for the session's hour; it is in no metadata, log or audit row.
- **Env audit** (`env.sh audit --changed`) reports `STRIPE_WEBHOOK_SECRET` missing on Vercel's Development target. The key predates this run (no commit here touches `web/.env.example`); it is the operator's to set if `vercel dev` is ever used. Logged in `error.log`.
- **Sandbox smoke:** with `STRIPE_CONNECTED_ACCOUNT_ID` set on the preview the fee shows on both dashboards; without it the payment is platform-only with no fee, as the tour checkout behaves.

Context budget: beyond `touches:`, read `booking-checkout.ts` (session creation, commission audit), `/reservar/confirmacao` and `/reserva/cancelar/[token]` (the precedents), `email-layout.ts`, `rate-limit.ts`, the webhook's tests, and Next 16's `redirect`, `not-found` and streaming notes.
