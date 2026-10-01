# Plan: unpaid-balances-panel-order

Build's execution plan in passes — each pass one layer of the change, in the order it lands, so
a session that resumes mid-build sees where it is. Written by the advisor pass (Define, or
Build's first act on `sonnet` after reading the spec), executed pass by pass, and rewritten when
reality disagrees with it — never left describing a plan that was abandoned.

## Passes

1. **The read** — `web/src/lib/quotes.ts` (`listUnpaidBalancesDue`, `UnpaidBalance` docs) —
   split the one query into `upcoming` (`event_date` between `todayKey(now)` and today +
   `BALANCE_FLAG_DAYS_BEFORE`, asc, `limit`) and `past` (`event_date < today`, desc, `limit`)
   plus a `count()` of past rows under the same predicate; share the predicate as one local
   `and(...)` so the three cannot drift; return `{ upcoming, past, pastTotal }`; run the three
   in `Promise.all`. Update the JSDoc (it says "soonest first" today). — done when: the
   function type-checks with the new shape and the eligibility predicate is byte-for-byte the
   old one plus the date split.
2. **The test** — `web/src/lib/quotes.test.ts` (or a sibling `unpaid-balances.test.ts` if the
   `@/db` mock would disturb the existing pure tests there) — mock `@/db` at the boundary the
   way `src/lib/message-log.test.ts` does; seed 55 past + 3 upcoming rows; assert all 3
   upcoming come back soonest first, past is capped and most-recent first, `pastTotal` is 55.
   — done when: the test fails against the old single-query shape and passes against the new.
3. **The panel** — `web/src/components/admin/unpaid-balances-panel.tsx` — props become
   `{ upcoming, past, hiddenPast }` (items as today); upcoming rows first; "Eventos passados"
   subheading over the past rows only when there are some; the "+ N eventos passados não
   mostrados" / "+ 1 evento passado não mostrado" muted line when `hiddenPast > 0`; render
   nothing when both lists are empty. Update the component's doc comment. — done when: the
   four states in the spec's fourth criterion read correctly.
4. **The caller** — `web/src/app/admin/sales/page.tsx` — the search branch and the `.catch`
   fallback return the empty shape; map both lists with the existing `UnpaidBalanceItem`
   mapper; `listQuoteBalanceMessages` reads the ids of both lists; pass
   `hiddenPast = pastTotal - past.length`. — done when: `lint.sh` is clean on the changed
   files and the draft is ready for the flip.

## Risks

- The `@/db` mock may not model `.orderBy/.limit/count()` — if the existing fakes only cover
  insert/update chains, the test asserts the query *calls* (two selects with separate limits,
  the date split, the sort directions) rather than a simulated result; say so in `notes.md`.
- `count()` in Drizzle returns a string from Neon on some drivers — coerce with `Number(...)`
  and test the coercion; signal: `pastTotal` concatenates or compares wrong.
- The `today` day key must be the same `todayKey(now)` used for the horizon, or an event
  dated today could fall in neither list (or both) across midnight Lisbon/UTC; signal: an
  event-day balance missing from the panel.
