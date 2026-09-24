# Tasks: quote-refunds

The queue, with a definition of done per item. Ticked by the stage that finishes the item —
a human checkbox, never a script's. The definition of done is seeded from the spec's
acceptance criteria when the run is opened; the queue is Build's own, one line per commit-sized
step, so a resuming session can pick up the first unticked line.

## Definition of done

- [x] From the lead detail, the team refunds a Stripe-paid deposit or balance in full or in part through the Reembolsar dialog (typed `REEMBOLSAR`, amount between €0.01 and paid − already refunded). The refund is issued on the account that took the money. The instalment's `refunded_amount_cents` and `refunded_fee_cents` equal Stripe's figures, so the row and both Stripe dashboards (connected account and platform) agree
- [x] The fee returned is proportional: half an instalment refunded returns half its application fee, a second partial refund tops the first up, and a full refund returns the whole fee exactly (unit tests over `proportionalFeeRefundCents` and the reconciler, with instalment fixtures)
- [x] A double-submitted admin refund produces one Stripe refund. An amount over the ceiling, zero, an instalment not `paid` (pending, issued, written off, fully refunded) or one with no payment intent is refused with a plain Portuguese message, not a 500, and nothing is written
- [x] A partial refund leaves the instalment `paid` with the refunded amount shown on its row. A full refund moves it to `refunded`
- [x] With "Cancelar também o evento" ticked (the default when the refund leaves the deposit fully refunded), a successful refund moves the quote to `cancelled`, writes off its `pending`/`issued` instalments, and the couple's quote link shows the "no longer valid" page. Unticked, the quote keeps its status. A refund Stripe refuses cancels nothing
- [x] A refund made in the Stripe dashboard on a quote instalment reaches `quote_payments` through `charge.refunded` / `refund.updated`: amounts set to the charge's cumulative figures, the fee topped up to the proportional target, and no "matches no booking" alert. Redelivering the event changes nothing. A later lower `amount_refunded` lowers the amounts but never walks the status back. Tour refunds behave exactly as before (existing webhook tests stay green)
- [x] When the deposit is fully refunded and the quote is not cancelled, the card shows the "event still held" warning with a Cancelar evento action (typed confirmation). The action cancels the quote and writes off its open instalments
- [x] Every refund, from the admin or the dashboard, sends the couple exactly one `quote-refunded` email in the lead's language through the message log. The email carries the quote ref, event date, instalment, amount this time, total refunded and whether the event is cancelled. The admin refund's webhook echo and any redelivery send nothing more. A second deliberate partial refund sends a second email. The `quote-refunded` kind is appended to `message_kind` by a new migration
- [x] Each refund writes one audit row on the quote with instalment kind, amounts, fee taken and returned, refund and charge ids, and `via` (admin with the operator, or stripe with no actor). Each cancellation writes its own audit row
- [ ] Unit tests cover the admin refund (full, partial, refusals, idempotency key, cancel-with-refund and refund-failure-cancels-nothing), the webhook quote-refund branch (full, partial, redelivery, admin echo, unknown charge still alerts, tour path untouched), the instalment status rule, and the email's once-per-refund key and content in PT and EN. CI is green

## Queue

- [x] Schema + migration 0029: `quote-refunded` kind, `message_log.quote_payment_id` + `refunded_total_cents`, the refund key, the receipt key narrowed — 5d93ff7
- [x] `lib/quotes.ts` refund rules + CAS write, `lib/booking-refund.ts` shared fee top-up, `lib/quote-refund.ts`, the refund email, audit actions, tests — 8a3d35a
- [x] Webhook refund branch tries the instalments before alerting, routing tests — d6fa61e
- [x] Admin actions, form schemas, the card's Reembolsar / Cancelar evento dialogs — cd19c95
- [ ] CI GREEN on the ready head (full gate) — then tick the last definition-of-done line
