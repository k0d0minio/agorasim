# Stub: Refund machinery — `refunded` gets a write path, fees return pro-rata, seats free up

- feature-slug: refund-machinery
- epic: commission-engine
- priority: P1
- size: M
- depends-on: tour-application-fees
- sequence: 3 of 3
- sources: agreement §6 ("Refunds return commission… in proportion"); 2026-08-29 data lens: webhook handles only `checkout.session.*` (`web/src/app/api/stripe/webhook/route.ts:34-45`), nothing ever writes `refunded`, `occupiesSeatSql` keeps counting refunded bookings (`web/src/lib/bookings.ts:116-131`), no refund columns

## Problem

A refund issued in the Stripe dashboard today leaves the booking `confirmed`: the
departure still counts the party (can show sold out for a refunded tour), the books
never say `refunded`, and no application fee would be returned. The agreement requires
commission refunded in proportion to any refund.

## Proposed change

Handle `charge.refunded` / `refund.updated` in the webhook: write `refunded` (or a
partial-refund representation) with refunded-amount and refund-id columns, release the
seats/vehicle by excluding refunded bookings from occupancy, and refund the
application fee proportionally (`refund_application_fee` or explicit fee refund),
recording what was returned. Admin booking detail shows refund state. This is the
substrate the cancellation-selfserve epic triggers.

## Since this was written (2026-08-31)

`cancellation-selfserve/cancel-route-flow` shipped ahead of this ticket rather
than behind it, so two of the statements above have moved:

- **Something now writes `refunded`.** `lib/booking-cancellation.ts` issues a
  full Stripe refund and writes `refunded` + `cancelled_via = 'guest'` itself,
  guarded on `status = 'confirmed'` and keyed with a per-booking idempotency
  key. This ticket's `charge.refunded` handler must therefore be idempotent
  against a booking *already* marked refunded by that path — it reconciles, it
  does not re-decide. The refund id is in the audit entry, not on the row; a
  `refund_id` column is still this ticket's to add.
- **Seats already free up.** `holdsCapacitySql` only ever counted `confirmed`
  and live `pending`, so a `refunded` booking releases its driver and car with
  no change — the occupancy bullet below is already satisfied. What remains is
  the dashboard-issued refund, which still leaves a booking `confirmed`.

The fee half is untouched and still entirely this ticket's: nothing takes an
application fee yet (no Connect, no `application_fee_amount` in
`lib/booking-checkout.ts`), so the guest cancel path returns no fee because
there is none to return. When `tour-application-fees` lands, the refund call in
`lib/booking-cancellation.ts` gains `refund_application_fee: true` and nothing
else there moves.

## Acceptance criteria (rough)

- [ ] Dashboard-issued sandbox refund → booking shows refunded, seats freed
- [ ] Partial refund represented honestly (amounts, not just a status)
- [ ] Application fee returned pro-rata and recorded
- [ ] CI green

## Prompt

In the agorasim repo (`web/`), give refunds a write path per
`.icm/intake/commission-engine/refund-machinery.md`: extend
`web/src/app/api/stripe/webhook/route.ts` to handle `charge.refunded`/`refund.updated`
idempotently, add refund columns to `bookings` via migration, exclude refunded
bookings from `occupiesSeatSql` in `web/src/lib/bookings.ts`, refund the application
fee proportionally when one was taken, and surface refund state on the admin sales
booking detail. Test the webhook paths as the existing webhook tests do. PR on a
`claude/` branch; no local checks — CI is the source of truth.
