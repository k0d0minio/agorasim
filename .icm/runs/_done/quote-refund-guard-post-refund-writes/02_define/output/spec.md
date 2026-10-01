# Spec: A database error after a quote refund is reported, not thrown

- slug: quote-refund-guard-post-refund-writes
- personas: team, operator
- touches: web/src/lib/quote-refund.ts, web/src/lib/quote-refund.test.ts, web/src/app/admin/sales/actions.ts, web/src/components/admin/quote-refund-dialogs.tsx
- complexity: trivial

## Problem

`refundQuotePayment` (`web/src/lib/quote-refund.ts`) promises never to throw for anything a
caller can be told about, but everything it does after Stripe has accepted the refund — the
`settleInstalmentRefund` writes (`recordPaymentRefund`, `recordPaymentRefundFee`, the event
cancellation) — is unguarded. A Neon error there throws through the `refundLeadQuotePayment`
server action: the operator gets an error page for money that did go back, the requested
cancellation and the couple's notice are skipped, and the dialog that is still open with its
typed confirmation invites a second press. Once the webhook echo has moved the row, that press
carries a new idempotency key and is a second real refund. This advances contracted feature ⑥
hardening — money already collected on a quote settles correctly under retries, races and stale
reads.

## Proposed change

Once Stripe has said yes, any error thrown by the writes that follow is caught inside
`refundQuotePayment`, logged loudly, and turned into a new outcome on the existing union —
"refunded, records not updated" — carrying what is known for certain: the payment, the amount
Stripe refunded this time, the Stripe refund id, and whether the operator asked for the event to
be cancelled. Nothing further is attempted in the catch: no retried write, no second cancellation
attempt. The `charge.refunded` / `refund.updated` webhook (`syncQuotePaymentRefundFromStripe`)
already reconciles the amounts, the commission, the audit row and the couple's notice from
Stripe's own figures; it never cancels an event, so a requested cancellation that did not land is
left to the operator.

The Sales board action maps that outcome to a success-shaped state, so the refund dialog closes
and the card refreshes — the typed confirmation is gone and a duplicate refund needs a fresh,
deliberate entry — and the card shows a **red** notice under "Reembolsar" (an explicit warning
state on `QuoteActionState`, rendered in the destructive style rather than the muted success
style). The notice says, in the admin's PT-PT (`.icm/docs/admin-pt-inventory.md`): the refund of
the amount was sent to Stripe; the records were not updated and will be corrected automatically;
do not refund again; and, only when the operator ticked "Cancelar também o evento", that the
event's cancellation is not confirmed and should be checked on the card after it reloads.
Indicative wording: *"Reembolso de {valor} enviado ao Stripe, mas o registo não foi atualizado —
vai ser acertado automaticamente. Não volte a reembolsar."* plus, when asked to cancel, *"O
cancelamento do evento não ficou confirmado: verifique o cartão depois de recarregar."*

Every path before the Stripe refund — the outcomes that exist today, including `refund-failed`
when Stripe refuses — behaves exactly as now.

## Acceptance criteria

- [ ] When `refunds.create` succeeds and a later write in the settle step throws (the refund
      write, the fee write, or the cancellation), `refundQuotePayment` resolves to the new
      "refunded, records not updated" outcome with the refunded amount, the refund id, the
      payment and whether a cancellation was requested — it does not throw.
- [ ] That case logs one `console.error` naming the quote ref, the instalment, the refund id,
      the amount, the cancellation request and the caught error, and saying the webhook will
      reconcile.
- [ ] Nothing more is attempted after the caught error: no retried write and no separate
      cancellation attempt.
- [ ] `refundLeadQuotePayment` maps the outcome to an `ok` state that closes the dialog and
      refreshes the card, carrying a warning the card renders in the destructive (red) style.
- [ ] The warning says the refund of the amount reached Stripe, the records will be corrected
      automatically, and not to refund again; when a cancellation was requested it also says the
      cancellation is not confirmed and to check the card after reload. PT-PT, per the admin
      vocabulary.
- [ ] Every existing outcome (`refunded`, `not-found`, `not-refundable`, `amount-invalid`,
      `refund-unavailable`, `refund-failed`) and its message is unchanged.
- [ ] `web/src/lib/quote-refund.test.ts` gains a test that forces the post-refund write to fail
      after a successful refund, once with and once without `cancelEvent`, asserting the new
      outcome, the log line, and that no cancellation was attempted after the failure; CI green.

## Out of scope

- The webhook echo racing the admin claim (`quote-refund-echo-race`, stub 3 of this epic) —
  this run guards the writes; it does not reorder the claim.
- Settling the admin refund from the charge's `amount_refunded` instead of the row's running
  total (`quote-refund-admin-reads-charge`, stub 1).
- The idempotency key shape (`refund-idempotency-cached-declines`, stub 4) — the "do not refund
  again" wording is the guard against a key that changes once the webhook moves the row.
- Database errors before the Stripe refund (`getPayment`) — no money has moved there; an error
  page is unchanged behaviour.
- Writing an audit row for the failed write — with the database failing it would most likely
  fail too; the webhook's settle writes the refund's audit row (as `via: "stripe"`).
- The tour-booking refund path (`booking-refund.ts`).

## Open questions

- none
