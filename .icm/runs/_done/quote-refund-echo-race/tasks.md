# Tasks: quote-refund-echo-race

The queue, with a definition of done per item. Ticked by the stage that finishes the item —
a human checkbox, never a script's. The definition of done is seeded from the spec's
acceptance criteria when the run is opened; the queue is Build's own, one line per commit-sized
step, so a resuming session can pick up the first unticked line.

## Definition of done

- [x] An admin refund whose webhook echo arrives before the admin path settles is deferred by the webhook (HTTP 503, nothing written, no notice sent), and the admin path then records the refund with its own actor and `via: admin` in the audit row
- [x] A redelivered echo after the admin path settled returns `already-synced` and writes nothing
- [x] An admin-issued refund whose echo arrives after the 10-minute window, with the row still unsynced, is synced as `via: stripe` exactly as a dashboard refund is today
- [x] A dashboard refund (no `metadata.via = "admin"`) is never deferred
- [x] When the admin path loses the claim and cancels the event, the couple receive one `quote-event-cancelled` email, and `refundQuotePayment` returns the post-refund instalment and the cancelled quote
- [x] "Cancelar evento" (`cancelHeldQuote`) sends the couple one `quote-event-cancelled` email when it cancels; a second call or a retry sends none
- [x] The ordinary admin refund with "cancel the event" ticked sends only the `quote-refunded` notice (saying cancelled), no `quote-event-cancelled`
- [x] The `quote-event-cancelled` email renders in PT and EN with the copy above and has no "refunded now" row
- [x] The migration adds `quote-event-cancelled` to `message_kind`, and the Notifications page shows it as "Evento cancelado"
- [x] A test runs the webhook echo before the admin settle and asserts the admin actor in the audit row and a notice matching the event's final state; CI green

## Queue

- [x] The `quote-event-cancelled` kind: `schema.ts` + `drizzle/0034_quote_event_cancelled_kind.sql` + journal/snapshot
- [x] The kind in `message-log.ts` (receipt-shaped subject) and `admin-messages.ts` ("Evento cancelado", its card)
- [x] Copy in `content/emails.ts` and `guestQuoteEventCancelledEmail` in `booking-emails.ts`, with builder tests
- [x] `quote-refund.ts`: the webhook defers a fresh quote-card refund; the lost-claim branch re-reads and notifies; `cancelHeldQuote` notifies
- [x] `webhook/route.ts`: `deferred` → 503, the carried refund passed through; route + lib tests
- [x] Ready flip, full gate GREEN
