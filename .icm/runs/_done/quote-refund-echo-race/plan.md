# Plan: quote-refund-echo-race

Build's execution plan in passes — each pass one layer of the change, in the order it lands, so
a session that resumes mid-build sees where it is. Written by the advisor pass (Define, or
Build's first act on `sonnet` after reading the spec), executed pass by pass, and rewritten when
reality disagrees with it — never left describing a plan that was abandoned.

## Passes

1. **Schema and migration** — `web/src/db/schema.ts` (`quote-event-cancelled` appended to
   `messageKindEnum`), a new `web/drizzle/00NN_*.sql` (`ALTER TYPE message_kind ADD VALUE`) +
   meta, per the `database-migration` skill — done when: `check-migrations.sh` is clean and the
   enum's TS order matches the SQL.
2. **Message log and the email** — `web/src/lib/message-log.ts` (the new kind in the
   `quoteId`-only subject shape, beside the receipt/balance kinds), `web/src/content/emails.ts`
   (`quoteEventCancelled`, the spec's copy table verbatim), `web/src/lib/booking-emails.ts`
   (`guestQuoteEventCancelledEmail`, reusing the refund notice's questions/sign-off/footer
   strings), `web/src/lib/admin-messages.ts` ("Evento cancelado") — done when: a builder test
   renders PT and EN with no "refunded now" row.
3. **The webhook defers** — `web/src/lib/quote-refund.ts` (`syncQuotePaymentRefundFromStripe`:
   after the `already-synced` check, read the event's refund or the charge's latest; `metadata.via
   === "admin"` and `created` within 10 minutes → `{ status: "deferred" }`; past the window →
   sync as `stripe` with a `console.warn`), `web/src/app/api/stripe/webhook/route.ts`
   (`deferred` → 503, no `captureError`) — done when: route and lib tests cover deferred, the
   redelivery's `already-synced`, past-window sync, and a dashboard refund never deferring.
4. **The admin path and the cancellation notice** — `web/src/lib/quote-refund.ts`
   (`settleInstalmentRefund`'s lost-claim branch re-reads the row and, when its `cancelEvent`
   actually cancelled, sends `quote-event-cancelled`; `cancelHeldQuote` sends it on cancel; the
   ordinary claimed path sends none) — done when: the echo-first test asserts the admin actor in
   the audit row and a notice matching the final state, and `cancelHeldQuote` sends once.
5. **CI** — push, `ci-status.sh` → GREEN; flip ready per Build.

## Risks

- `ALTER TYPE … ADD VALUE` cannot run inside a transaction on older Postgres and the new value
  cannot be used in the same transaction — the signal is a failing migration step in CI; keep the
  migration to the one statement.
- Stubs 1 and 2 of this epic edit the same file; whichever merges second rebases. The signal is a
  conflict in `quote-refund.ts` — resolve by keeping both changes, never by dropping a guard.
- A 503 that Sentry or an uptime alert treats as an outage — the signal is an alert on a deferred
  delivery; the route must log it as expected behaviour.
