# Spec: An admin quote refund keeps its actor, and the couple are told the event's real state

- slug: quote-refund-echo-race
- personas: team, operator, guest
- touches: web/src/lib/quote-refund.ts, web/src/app/api/stripe/webhook/route.ts, web/src/lib/message-log.ts, web/src/db/schema.ts, web/drizzle/, web/src/lib/booking-emails.ts, web/src/content/emails.ts, web/src/lib/admin-messages.ts
- complexity: complex

## Problem

Contracted feature ⑥ hardening — money already collected on a quote settles correctly under
retries, races and stale reads. Today, when Stripe's `charge.refunded` (or `refund.updated`) for
a refund the team issued from the quote card reaches the webhook before the admin path's own
`recordPaymentRefund`, the webhook wins the compare-and-set in `settleInstalmentRefund`
(`web/src/lib/quote-refund.ts`): the audit row says `via: stripe` with no actor, the couple's
`quote-refunded` notice goes out saying the event is still booked, and the admin path's
`claimed: false` branch then cancels the event — so the couple are never told it is off, and the
action hands the Sales board the pre-refund row. Separately, "Cancelar evento"
(`cancelHeldQuote`) calls off a quote whose deposit went back earlier without telling the couple
at all, so the last thing they heard is that their event is still on.

## Proposed change

**1. The admin refund claims first — the webhook defers to it.** When
`syncQuotePaymentRefundFromStripe` finds the instalment row *not* already in line with the charge
(the existing `already-synced` short-circuit runs first and is unchanged), it looks at the refund
the event is about — the event's own refund on `refund.updated`, otherwise the charge's most
recent refund. If that refund carries `metadata.via = "admin"` and was created less than
**10 minutes** ago (Stripe's `created`), the sync writes nothing, sends nothing and returns a new
outcome, `deferred`. The webhook route answers a `deferred` outcome with **HTTP 503** (body says
deferred; logged at info/warn level, **not** reported to Sentry as an error), so Stripe redelivers
the event later. By then either the admin path has settled the row (the redelivery finds
`already-synced`) or the admin path died before settling, and the redelivery — past the window —
syncs it as today (`via: stripe`, with a `console.warn` that an admin-issued refund was settled by
its echo). Ten minutes is longer than the 300-second Vercel function limit the admin action runs
under, so in normal operation the admin path always claims first. The tour path
(`syncRefundFromStripe`) is untouched.

**2. The admin path's lost-claim branch returns the real row.** When `settleInstalmentRefund`'s
compare-and-set loses (`claimed: false`) on the admin path, the outcome `refundQuotePayment`
returns carries the instalment and quote as they now stand in the database (re-read), never the
pre-refund row.

**3. A cancellation the couple have not been told about gets its own notice.** A new message kind,
`quote-event-cancelled` (to the guest), is sent when an event is called off *after* the couple's
last word was "still booked":

- from `settleInstalmentRefund`'s lost-claim branch, when the operator asked to cancel and that
  call actually moved the quote to `cancelled` (the echo's notice said "held");
- from `cancelHeldQuote` ("Cancelar evento"), whenever it cancels.

It is **not** sent on the ordinary admin path, where the `quote-refunded` notice is sent after the
cancellation and already says the event is off. It is claimed once per quote in the message log
(the existing `message_log_quote_receipt_key` shape: `quoteId` set, no `quoteSentAt`, no
`quotePaymentId`), so a retry or a second "Cancelar evento" never sends it twice. It never throws
and never undoes the cancellation, as the refund notice. Adding the kind is a migration
(`ALTER TYPE message_kind ADD VALUE 'quote-event-cancelled'`, appended at the end of
`messageKindEnum`); the Notifications page labels it **"Evento cancelado"**.

The email is a dedicated, short builder beside `guestQuoteRefundEmail` — no "refunded now" row,
because no new money moves. Copy (`web/src/content/emails.ts`, new `quoteEventCancelled` object):

| Field | PT | EN |
| --- | --- | --- |
| subject | Evento cancelado — {date} | Event cancelled — {date} |
| preheader | Referência {ref} · o seu evento foi cancelado | Reference {ref} · your event has been cancelled |
| banner | Evento cancelado | Event cancelled |
| greeting | Olá {name}, | Hello {name}, |
| lead | O seu evento de {date} foi cancelado. O reembolso de {totalRefunded} já foi feito — enviámos-lhe os detalhes num email anterior. | Your event on {date} has been cancelled. The refund of {totalRefunded} has already been made — we sent you its details in an earlier email. |
| details heading | O seu evento | Your event |
| rows | Referência · Data do evento · Local (when set) · O evento: Cancelado · Total reembolsado neste orçamento | Reference · Event date · Venue (when set) · The event: Cancelled · Total refunded on this quote |

The questions line, the two contacts, the sign-off and the footer note are the refund notice's
own strings, reused. Same muted banner as the refund notice; reply-to the site address; the
quote's locale.

## Acceptance criteria

- [ ] An admin refund whose webhook echo arrives before the admin path settles is deferred by the webhook (HTTP 503, nothing written, no notice sent), and the admin path then records the refund with its own actor and `via: admin` in the audit row
- [ ] A redelivered echo after the admin path settled returns `already-synced` and writes nothing
- [ ] An admin-issued refund whose echo arrives after the 10-minute window, with the row still unsynced, is synced as `via: stripe` exactly as a dashboard refund is today
- [ ] A dashboard refund (no `metadata.via = "admin"`) is never deferred
- [ ] When the admin path loses the claim and cancels the event, the couple receive one `quote-event-cancelled` email, and `refundQuotePayment` returns the post-refund instalment and the cancelled quote
- [ ] "Cancelar evento" (`cancelHeldQuote`) sends the couple one `quote-event-cancelled` email when it cancels; a second call or a retry sends none
- [ ] The ordinary admin refund with "cancel the event" ticked sends only the `quote-refunded` notice (saying cancelled), no `quote-event-cancelled`
- [ ] The `quote-event-cancelled` email renders in PT and EN with the copy above and has no "refunded now" row
- [ ] The migration adds `quote-event-cancelled` to `message_kind`, and the Notifications page shows it as "Evento cancelado"
- [ ] A test runs the webhook echo before the admin settle and asserts the admin actor in the audit row and a notice matching the event's final state; CI green

## Out of scope

- The stale-total read (`quote-refund-admin-reads-charge`, stub 1) and the post-refund write guard (`quote-refund-guard-post-refund-writes`, stub 2) of this epic.
- The idempotency key on refund attempts (`refund-idempotency-cached-declines`) and the shared Stripe-refund skeleton (`refund-paths-dedupe`).
- The tour-booking refund path — it already claims the row before the money moves.
- A cancellation notice for any other way a quote becomes `cancelled`.
- What the terms allow (D9's 30 days, the `[LAWYER]` items) — unchanged.

## Open questions

- none

Context budget: read `booking-emails.ts`, `content/emails.ts`, `message-log.ts` and `schema.ts`
excerpts beyond the Inputs table to settle the second notice's key, copy and migration.
Data protection: no new processor or data flow — one more Resend email to the same guest, logged
in `message_log` like the refund notice.
