# Stub: Deposit and balance payment links with the 6% proportional fee

- feature-slug: payment-links
- epic: quote-flow
- priority: P1
- size: M
- depends-on: admin-quote-builder
- sequence: 3 of 5
- sources: proposal feature ⑥ + §5; agreement §5 ("6% of the deposit when the deposit is paid, and 6% of the balance when the balance is paid — so it always nets to exactly 6%")

## Problem

The quote page has nowhere to pay. Each quote payment (30% deposit, 70% balance)
needs its own Stripe checkout carrying its own proportional 6% application fee, its
webhook confirmation, and its state on the quote.

## Proposed change

Wire each `quote_payments` row to a Stripe Checkout session (Connect-aware via the
commission-engine scaffolding; fee from the shared commission module's 6% path).
Webhook confirms the payment row, advances quote status (deposit-paid → date held;
paid), emails guest + team. Deposit success is what **holds the date** — record it
visibly. Refunds on quote payments return their fee pro-rata (reuse refund
machinery).

## Acceptance criteria (rough)

- [ ] Deposit link takes sandbox payment with 6%-of-deposit fee; quote → deposit-paid
- [ ] Balance link likewise; the two fees sum to exactly 6% of the total
- [ ] Webhook idempotent per payment row; emails sent; CI green

## Prompt

In the agorasim repo (`web/`), wire quote payments to Stripe per
`.icm/intake/quote-flow/payment-links.md`: checkout session per `quote_payments` row
(Connect-aware — see `web/src/lib/booking-checkout.ts` and the commission module
`web/src/lib/commission.ts` from the commission-engine epic; 6% proportional per
agreement §5 in `.icm/docs/agorasim-commission-and-payments-agreement.pdf`), webhook
confirmation extending `web/src/app/api/stripe/webhook/route.ts`, status advance +
guest/team emails via the existing email lib. Depends on commission-engine and
admin-quote-builder being on main — verify before starting. PR on a `claude/`
branch; no local checks — CI is the source of truth.
