# Stub: A late charge.refunded event pulls a refunded row back below Stripe's total

- lane: bug
- found-by: quote-refund-admin-reads-charge · Define · 2026-10-01
- complexity: low
- priority: P2

## Problem

`chargeBehind` (`web/src/app/api/stripe/webhook/route.ts`) reconciles `charge.refunded` from
the event's own `data.object` — the charge as it was when the event was created. Stripe does
not guarantee delivery order, so a delayed or redelivered event for an earlier refund carries a
lower `amount_refunded` than a later refund already recorded. Both reconcilers
(`syncRefundFromStripe` in `web/src/lib/booking-refund.ts`, `syncQuotePaymentRefundFromStripe`
in `web/src/lib/quote-refund.ts`) then "follow Stripe down", log "needs a human", and leave the
row below what has really gone back until another event arrives — which may never happen.

## Proposed change

Re-read the charge on the owning account for `charge.refunded` too (as `refund.updated`
already does), so every refund event reconciles from Stripe's current figure, never a snapshot.

## Prompt

In the agorasim repo (`web/`), read `.icm/intake/triage/refund-webhook-stale-charge-snapshot.md`.
Make `chargeBehind` retrieve the charge for `charge.refunded` events as it does for
`refund.updated`, and add a webhook test where a stale `charge.refunded` snapshot arrives after
a later refund was recorded and the row stays at Stripe's current total. `git mv` the stub to
`_done/` in the PR, on a `claude/` branch; CI is the source of truth.
