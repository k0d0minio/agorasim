# Build notes: unpaid-balances-panel-order

- commits: feat: unpaid-balances-panel-order — split "Saldo por pagar" into upcoming and past
- ci: pending

## What changed

- `web/src/lib/quotes.ts`: `listUnpaidBalancesDue` now returns `{ upcoming, past, pastTotal }`
  from three reads run together — upcoming (`event_date` today..today+3, asc, `limit`), past
  (`event_date < today`, desc, `limit`) and a `count()` of the past rows. All three share one
  `open` predicate (deposit-paid, balance instalment `pending`/`issued`, `amount_cents > 0`),
  byte-for-byte the old rule; only the date split, the order and the caps are new. `count()`
  is coerced with `Number(...)` in case the driver returns text.
- `web/src/components/admin/unpaid-balances-panel.tsx`: props are `{ upcoming, past,
  hiddenPast }`; upcoming rows first as before; past rows in their own section under
  "Eventos passados", with "+ N eventos passados não mostrados" (or the singular) when
  `hiddenPast > 0`; renders nothing when both lists are empty. The row markup moved into a
  local `UnpaidBalanceList` unchanged.
- `web/src/app/admin/sales/page.tsx`: the search branch and the read-failure fallback return
  one empty `NO_UNPAID_BALANCES`; the balance-messages read covers both lists; `hiddenPast` is
  `pastTotal − past.length`, floored at 0.
- `web/src/lib/unpaid-balances.test.ts` (new): the `quote-writes.test.ts` proxy harness over
  the real schema.

## Acceptance criteria status

- [x] Upcoming balances survive a >50 past pile-up, first, soonest first — separate read with its own cap; test "keeps every soon-due balance…" and the SQL assertions on read 0.
- [x] Past balances stay visible under "Eventos passados", most recent first; the eligibility rule is unchanged — `desc` order on read 1; predicate asserted on all three reads.
- [x] Hidden-past line, singular for 1, absent when none hidden — panel `hiddenPast` branch.
- [x] No past rows → no subheading; no rows → no panel; search hides it; read failure leaves the board up — panel early return, `NO_UNPAID_BALANCES` on both paths.
- [ ] `@/db`-boundary test seeding >50 past rows + upcoming rows; CI green — test written; CI verdict pending.

## Notes for Release

- The harness applies no `LIMIT`, so the test queues what Postgres would return under each
  cap (50 past rows against a count of 55) and asserts the structure that makes the
  guarantee: two row reads with a `limit(50)` each, the split at today, the sort directions,
  and the shared predicate on every read. It would fail against the old single-query shape
  (one `select`, one `limit`, no `<` split).
- The three reads run in `Promise.all`; the harness resolves queued results in `then` order,
  which follows array order.
