# Spec: Refunding a deposit or balance reaches the books, and the fee comes back pro-rata

- slug: quote-refunds
- personas: team, operator
- touches: web/src/lib/booking-refund.ts, web/src/lib/quotes.ts, web/src/app/api/stripe/webhook/route.ts, web/src/app/admin/sales/actions.ts, web/src/components/admin/lead-quote-card.tsx, web/src/content/emails.ts, web/src/lib/message-log.ts, web/src/db/schema.ts, web/drizzle
- complexity: complex

## Problem

The live terms promise a couple their deposit back in full when an event is cancelled outside
30 days (D9, `web/src/content/terms.ts`), but no code can honour that. The admin has no way to
refund an instalment. A refund issued in the Stripe dashboard reaches the webhook and alerts
"matches no booking", because the refund reconciler (`lib/booking-refund.ts`) looks only at
`bookings`. `recordPaymentRefund` (`lib/quotes.ts`) has no caller, so `quote_payments` never
records the money or the 6% fee returned. This completes contracted feature ⑥ (weddings and
events money): the terms' refund promise gets a mechanism, and the commission agreement's
"refunds return commission in proportion" holds for events as it already does for tours.

## Proposed change

**Refund from the admin.** On the lead detail's quote card, each paid instalment row
(deposit, balance or other) that was paid through Stripe has a **Reembolsar** action. It opens
a dialog built like the tour refund (`cancel-booking-dialog.tsx`):

- an amount field starting at everything still refundable on that instalment (paid − already
  refunded), taking any amount from €0.01 up to that ceiling;
- a read-back of paid / already refunded / maximum now;
- a **"Cancelar também o evento"** box, ticked by default when this refund leaves the deposit
  fully refunded, unticked otherwise;
- the typed confirmation `REEMBOLSAR` (`REFUND_CONFIRMATION`), which arms the button.

On submit, the refund is issued against the instalment's payment intent on the account that
took the money. When the charge carried an application fee, it goes back in proportion, the
same way the tour path does it (`refund_application_fee`, then the reconciler tops it up). A
retried or double-submitted form produces one refund. The instalment row records what Stripe
says came back, and so does the returned fee. If the box was ticked, the quote moves to
`cancelled`. Any instalment still `pending` or `issued` on it is written off (`cancelled`), so
no balance can be requested or paid afterwards. The couple's quote link then shows the neutral
"no longer valid" page (#122's behaviour for a cancelled quote).

A refund Stripe refuses leaves the row and the quote unchanged and shows a plain Portuguese
error. The quote is cancelled only after the refund succeeds.

**Refund from the Stripe dashboard.** The `charge.refunded` / `refund.updated` branch
resolves the charge to a quote instalment when it matches no booking (by charge id or payment
intent — the columns `quote_payments` shares with `bookings` for this reason, `schema.ts` note
on `quotePayments`). It reconciles that instalment exactly as `syncRefundFromStripe` does for
a booking:

- amounts set to the charge's cumulative `amount_refunded`, never added to, so a redelivered
  event converges on the same numbers;
- a compare-and-set write;
- the fee topped up to the proportional target on the platform account;
- never walking a status back.

Only a charge that matches neither a booking nor an instalment raises the "needs a human"
alert. A dashboard refund never cancels the quote.

**Instalment status.** A refund that returns the whole instalment moves it to `refunded`. A
partial refund leaves it `paid`, and the refunded amount is shown beside it. The shipped
`recordPaymentRefund` behaviour changes to match: it currently adds amounts and always writes
`refunded`.

**The card after a refund.** Each instalment row shows its refunded amount when there is one
("reembolsado €X"). When the deposit has been refunded in full and the quote is not cancelled
(a dashboard refund, or the box left unticked), the card shows a warning that the event is
still held and the balance will still be requested. The warning carries a **Cancelar evento**
action with the same typed-confirmation gesture. It cancels the quote and writes off its open
instalments, as the ticked box does.

**The couple's email.** Every refund of an instalment sends the couple one `quote-refunded`
email, from the admin or the dashboard: a new message kind, appended to the enum by migration,
sent through the message log in the lead's language (PT/EN). It states:

- the quote ref and event date;
- which instalment was refunded;
- the amount refunded this time and the total refunded on the quote so far;
- whether the event is cancelled.

It is keyed per refund, so a webhook redelivery, or the webhook echo of an admin refund, sends
nothing a second time, while a second deliberate partial refund sends a second email. The team
gets no copy.

**Audit.** Every refund writes one audit row on the quote. The row records the instalment
kind, the amount paid, the cumulative amount refunded, the fee taken and the fee returned, and
Stripe's refund and charge ids. For an admin refund it also records `via: admin` and the
operator as actor. For a dashboard refund it records `via: stripe` and no actor. Cancelling the
quote (the box or the card action) writes its own audit row with the operator.

## Acceptance criteria

- [ ] From the lead detail, the team refunds a Stripe-paid deposit or balance in full or in part through the Reembolsar dialog (typed `REEMBOLSAR`, amount between €0.01 and paid − already refunded). The refund is issued on the account that took the money. The instalment's `refunded_amount_cents` and `refunded_fee_cents` equal Stripe's figures, so the row and both Stripe dashboards (connected account and platform) agree
- [ ] The fee returned is proportional: half an instalment refunded returns half its application fee, a second partial refund tops the first up, and a full refund returns the whole fee exactly (unit tests over `proportionalFeeRefundCents` and the reconciler, with instalment fixtures)
- [ ] A double-submitted admin refund produces one Stripe refund. An amount over the ceiling, zero, an instalment not `paid` (pending, issued, written off, fully refunded) or one with no payment intent is refused with a plain Portuguese message, not a 500, and nothing is written
- [ ] A partial refund leaves the instalment `paid` with the refunded amount shown on its row. A full refund moves it to `refunded`
- [ ] With "Cancelar também o evento" ticked (the default when the refund leaves the deposit fully refunded), a successful refund moves the quote to `cancelled`, writes off its `pending`/`issued` instalments, and the couple's quote link shows the "no longer valid" page. Unticked, the quote keeps its status. A refund Stripe refuses cancels nothing
- [ ] A refund made in the Stripe dashboard on a quote instalment reaches `quote_payments` through `charge.refunded` / `refund.updated`: amounts set to the charge's cumulative figures, the fee topped up to the proportional target, and no "matches no booking" alert. Redelivering the event changes nothing. A later lower `amount_refunded` lowers the amounts but never walks the status back. Tour refunds behave exactly as before (existing webhook tests stay green)
- [ ] When the deposit is fully refunded and the quote is not cancelled, the card shows the "event still held" warning with a Cancelar evento action (typed confirmation). The action cancels the quote and writes off its open instalments
- [ ] Every refund, from the admin or the dashboard, sends the couple exactly one `quote-refunded` email in the lead's language through the message log. The email carries the quote ref, event date, instalment, amount this time, total refunded and whether the event is cancelled. The admin refund's webhook echo and any redelivery send nothing more. A second deliberate partial refund sends a second email. The `quote-refunded` kind is appended to `message_kind` by a new migration
- [ ] Each refund writes one audit row on the quote with instalment kind, amounts, fee taken and returned, refund and charge ids, and `via` (admin with the operator, or stripe with no actor). Each cancellation writes its own audit row
- [ ] Unit tests cover the admin refund (full, partial, refusals, idempotency key, cancel-with-refund and refund-failure-cancels-nothing), the webhook quote-refund branch (full, partial, redelivery, admin echo, unknown charge still alerts, tour path untouched), the instalment status rule, and the email's once-per-refund key and content in PT and EN. CI is green

## Out of scope

- The cancellation rule itself (D9's 30-day default and the `[LAWYER]` items on the "sinal"
  and an our-side rule): the dialog trusts the team's judgement on the amount, and nothing
  here computes what the terms allow.
- Guest self-serve cancellation or refund of an event: by hand, with the team.
- Refunding an instalment written off as paid by bank transfer (`cancelled` rows with no
  Stripe charge): money that never went through Stripe goes back the way it came.
- Releasing calendar capacity: `quote-flow/event-holds-capacity` reads the quote's status,
  and `cancelled` is what it will release on.
- Moving the lead's stage off `booked` when an event is cancelled: the lead's history stays as
  it was.
- A team copy of the refund email.
- Any change to the terms text.

## Open questions

- none. Settled with the operator in session on 2026-09-24:
  - a full deposit refund cancels the event only when the dialog's box says so (default
    ticked), and dashboard refunds flag the card instead;
  - every refund, from the admin or the dashboard, emails the couple once;
  - the stub's "releases the date automatically" question is answered by the box, not by a
    rule.
