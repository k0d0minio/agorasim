# Tasks: unpaid-balances-panel-order

The queue, with a definition of done per item. Ticked by the stage that finishes the item —
a human checkbox, never a script's. The definition of done is seeded from the spec's
acceptance criteria when the run is opened; the queue is Build's own, one line per commit-sized
step, so a resuming session can pick up the first unticked line.

## Definition of done

- [ ] With more than 50 unresolved past balances and at least one balance due inside T−3, every upcoming (T−3 to today) balance appears on the panel, listed first, soonest first
- [ ] Past unresolved balances remain visible under an "Eventos passados" subheading, most recent first; nothing that `isBalanceFlagged` flags is filtered out, only separated and capped
- [ ] When more past balances exist than the panel shows, a line states how many are not shown ("+ N eventos passados não mostrados", singular form for 1); with none hidden, no such line
- [ ] With no past rows the panel looks as it does today (no subheading); with no rows at all the panel is not rendered; a search still hides it; a read failure still leaves the board up without the panel
- [ ] A test at the `@/db` boundary (the repo's convention — e.g. `message-log.test.ts`) seeds more than 50 past rows plus upcoming rows inside T−3 and asserts the upcoming ones all come back, ordered soonest first, alongside the capped past list (most recent first) and the true past total; CI green

## Queue

- [x] `web/src/lib/quotes.ts` — `listUnpaidBalancesDue` split into upcoming / past / past count over one shared predicate
- [x] `web/src/lib/unpaid-balances.test.ts` — the `@/db`-boundary test (sibling file: `quotes.test.ts` is pure and statically imports `@/lib/quotes`)
- [x] `web/src/components/admin/unpaid-balances-panel.tsx` — upcoming first, "Eventos passados" section, hidden-past line
- [x] `web/src/app/admin/sales/page.tsx` — caller on the new shape, empty shape for search and read failure
- [ ] pre-flip check, merge `origin/main`, flip ready, settle the full gate
