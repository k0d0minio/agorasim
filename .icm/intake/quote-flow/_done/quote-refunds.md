# Stub: Refunding a deposit or balance reaches the books, and the fee comes back pro-rata

- feature-slug: quote-refunds
- scope: quote-flow
- personas: team, operator
- initiative: contracted feature ⑥ complete after launch / objective: the terms' refund promise for events has a mechanism
- priority: P1
- size: M
- depends-on: quote-page-and-deposit-link
- sequence: 4 of 6
- sources: product lens 2026-09-18 — the live terms promise the deposit back in full when cancelling outside 30 days (`web/src/content/terms.ts:154,236`) while the refund library and the refund webhook path are bookings-only (`web/src/lib/booking-refund.ts:141,471,488-499`) and `recordPaymentRefund` (`quotes.ts:856`) has no caller; data lens — `schema.ts:1366-1369` states both tables must share the reconciler; the shipped tour refund path (#65, #75) is the model

## Problem

The site promises a refund rule for events that no code can honour: an admin cannot
refund an instalment, and a refund issued in the Stripe dashboard would never reach
`quote_payments` or return the 6% fee.

## Proposed change

Extend the refund path to quote payments: a "Reembolsar" action on the quote's instalment
row in the lead detail (typed confirmation as the tour refund has), full or partial,
returning the application fee pro-rata on the connected account; the `charge.refunded` /
`refund.updated` webhook branch resolves quote sessions as well as bookings so a
dashboard refund is recorded too; the instalment row shows refunded amounts; the
`quote-refunded` message (or a reuse of the cancellation kind — Define decides) through
the log; audit rows.

## Acceptance criteria (rough)

- [ ] From the admin, a deposit or balance is refunded in full or part; the fee comes back pro-rata; the row and the Stripe dashboards agree (tests over the shipped reconciler pattern)
- [ ] A refund made in the Stripe dashboard reaches `quote_payments` through the webhook
- [ ] CI green

## Out of scope (this feature)

- The cancellation rule itself (D9 default; `[LAWYER]` open) — this stub gives the rule a
  mechanism, it does not decide the rule.
- Guest self-serve cancellation of an event — by hand with the team.

## Notes for Define

- Reuse `booking-refund.ts`'s fee arithmetic and the reconciler's session lookup; the
  schema note at `schema.ts:1366-1369` is the contract.
- Open for Define: whether a refunded deposit releases the date automatically (stub 5's
  concern) — default: it flags the quote, the team releases by hand.

## Prompt

In the agorasim repo (`web/`), read `.icm/intake/quote-flow/quote-refunds.md` and the
breakdown. Extend `src/lib/booking-refund.ts` and the Stripe webhook's refund branch to
quote payments (`recordPaymentRefund`), add the admin action and confirmation on the lead
detail, the logged message and audit rows. Tests for the pro-rata fee return and the
dashboard-refund path. PR on a `claude/` branch; no local checks — CI is the source of truth.
