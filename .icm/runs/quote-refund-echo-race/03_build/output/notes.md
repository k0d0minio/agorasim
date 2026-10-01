# Build notes: quote-refund-echo-race

- commits: feat: quote-refund-echo-race — the admin refund claims first, and a late cancellation is told
- ci: pending — draft head; full gate settles after the ready flip

## What changed

- `web/src/db/schema.ts`, `web/drizzle/0034_quote_event_cancelled_kind.sql` (+ journal, snapshot): `quote-event-cancelled` appended to `message_kind` (`ADD VALUE IF NOT EXISTS`, as 0026/0029 do).
- `web/src/lib/message-log.ts`: `QUOTE_CANCELLATION_KINDS`, sharing the receipt-shaped subject (quote only) and so `message_log_quote_receipt_key` — once per quote.
- `web/src/lib/admin-messages.ts`: the label "Evento cancelado" and a card on the Notifications page (the card count test moves from 12 to 13).
- `web/src/content/emails.ts`, `web/src/lib/booking-emails.ts`: `quoteEventCancelled` copy (the spec's table, verbatim) and `guestQuoteEventCancelledEmail` — reference, date, venue, "O evento: Cancelado", total refunded; no refunded-now or paid row. The questions line, sign-off and footer are `quoteRefund`'s.
- `web/src/lib/quote-refund.ts`:
  - `syncQuotePaymentRefundFromStripe` — after the unchanged `already-synced` check, when Stripe's total is above the row it reads the refund behind the event (carried on `refund.updated`, else retrieved by id, else the charge's latest); a non-failed refund with `metadata.via = "admin"` for this instalment, under `ADMIN_REFUND_SETTLE_WINDOW_MS` (10 min) old, returns `deferred`. Past the window it settles as `stripe` with a `console.warn`. A refund that cannot be read is never deferred.
  - `settleInstalmentRefund`'s lost-claim branch sends `quote-event-cancelled` when its own `cancelEvent` call actually cancelled, and returns the row and quote re-read.
  - `cancelHeldQuote` sends `quote-event-cancelled` when it cancels.
- `web/src/app/api/stripe/webhook/route.ts`: passes the `refund.updated` refund through; `deferred` → HTTP 503 with a `console.warn`, no `captureError`/`captureAlert`.
- Tests: `quote-refund.test.ts` (the race, both orders; redelivery; past-window; dashboard never deferred; ordinary cancel sends one notice; `cancelHeldQuote` once), `route.quote.test.ts` (503 on deferred), `booking-emails.test.ts` (PT/EN, no refund row), `admin-messages.test.ts` (13 cards). The existing `cancelHeldQuote` test asserted no email; it now asserts the one notice — the spec changed that behaviour.

## Acceptance criteria status

- [x] Echo first is deferred (503, nothing written, no notice) and the card records the admin actor, `via: admin` — `quote-refund.test.ts` "defers the echo…", `route.quote.test.ts` "asks Stripe to redeliver…"
- [x] Redelivery after settle → `already-synced`, nothing written — "finds the refund written when Stripe redelivers…"
- [x] Past the 10-minute window → synced as `via: stripe` — "settles a card refund as Stripe's once the window has passed"
- [x] A dashboard refund is never deferred — "never defers a dashboard refund, however fresh"
- [x] Lost claim + cancel → one `quote-event-cancelled`, outcome carries the refunded row and cancelled quote — "tells the couple it is off when the echo won anyway…"
- [x] `cancelHeldQuote` sends one notice; a second call sends none — `cancelHeldQuote` tests
- [x] Ordinary refund + cancel sends only `quote-refunded` — "sends only the refund notice…"
- [x] PT and EN copy, no refunded-now row — `booking-emails.test.ts`
- [x] Migration adds the kind; Notifications page shows "Evento cancelado" — `0034`, `admin-messages.ts`
- [ ] A test runs the echo before the admin settle; CI green — the test is written; CI settles after the ready flip

## Notes for Release

- `security-check.sh --branch` → `BLOCKED 1` on **dependency-audit only** (secrets passed): 1 critical (`next` 16.3.4 — `next/og` RCE, patched 16.3.6) and 3 high (undici under `shadcn` and `@vercel/blob`), all on `main`'s lockfile, which this branch does not touch. Parked per the security-audit skill as `.icm/intake/triage/deps-next-undici-advisories.md` (chore, P0). Release stop class 2 will see the same finding until that chore merges.
- The run had no Neon branch of its own (`error.log`: HTTP 422, branch limit on `uat-agorasim`), so the migration is proven only by the preview build's migrate step — check the preview's build log shows `0034` applied.
- A deferred delivery answers 503 by design. Stripe's dashboard will show the attempt as failed until the redelivery succeeds; nothing pages anyone.
- `content/privacy.ts` lists the emails the couple can receive ("…and the refund notice"); it is not updated here — the spec names no privacy copy change and no processor changes. Worth a look at Release if the list should name the cancellation notice.
- Stubs 1 and 2 of this epic edit `quote-refund.ts` too; whichever merges second resolves against this.
