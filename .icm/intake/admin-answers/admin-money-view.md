# Stub: The takings on a screen — month, upcoming, refunds, fee

- feature-slug: admin-money-view
- epic: admin-answers
- priority: P2
- size: M
- depends-on: admin-dashboard-what-needs-me
- sequence: 4 of 5
- blocked: scope — feature-shaped, outside the six contracted features; needs Jamie's
  call before any code
- sources: admin audit §6, harvested 2026-08-31; `web/src/db/schema.ts:606`
  (`amountCents`, `currency`, `priceBreakdown`, `confirmedAt`, `cancelledAt` — written
  by every paid checkout, summed nowhere); `web/src/lib/sales.ts:266` (one card's
  total, the only money the admin prints); `commission-engine/` for the fee row

## Problem

`bookings` carries `amountCents`, `currency`, `priceBreakdown`, `status`,
`confirmedAt` and `cancelledAt` (`web/src/db/schema.ts:606`), and every paid
checkout writes them. Nothing in the admin adds them up. The Sales board prints one
card's total (`web/src/lib/sales.ts:266`); the dashboard counts leads, drafts and
feature requests and no euros at all. So "how much did we take this month?", "what
is booked for next week?" and "what did we refund?" are questions Diogo & Rita
answer in the Stripe dashboard — the second system the audit warned about, now on
the money rather than on the bookings.

This lands harder once the commission engine ships: a 4% application fee (min €10,
cap €50) that nobody can see against the takings it was charged on is a fee that
gets queried by e-mail every month.

## Proposed change

One small money surface — a section on the dashboard or a `/admin/receitas` screen:
confirmed takings this month and next, count and value of upcoming departures,
refunds in the period, and (once `commission-engine` lands) the fee alongside. All
of it derives from `bookings` plus the Stripe ids already stored; no new table, no
reconciliation job. Explicitly not accounting — a number Rita can trust at a glance,
with the Stripe dashboard remaining the record.

Feature-shaped and outside the six contracted features, so it needs Jamie's scope
call before it is built. Best sequenced after `commission-engine/` so the fee row is
built once.

## Prompt

In the agorasim repo (`web/`), add the admin money view per
`.icm/intake/admin-answers/admin-money-view.md` — confirm with Jamie that it is in scope
before building. Derive everything from `bookings` (`web/src/db/schema.ts`):
confirmed takings for the current and next month, upcoming departures by count and
value, refunds in the period; render as a section of the admin dashboard or a
dedicated screen, money formatted through `web/src/lib/money.ts`. If
`commission-engine/` has landed, show the application fee against the same period.
Portuguese strings — the admin is PT (D4 in `.icm/project.md`). PR on a `claude/`
branch; no local checks — CI is the source of truth.
