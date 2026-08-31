# Stub: Remove the example bookings from the live Sales board

- feature-slug: remove-example-bookings
- epic: booking-live
- priority: P1
- size: S
- depends-on: none
- sequence: 6 of 8
- sources: D3 (2026-08-29); `web/src/lib/sales.ts:222-226` (`listSalesBoard()` unconditionally appends `exampleBookingRecords()`); `web/src/lib/admin-preview.ts:42-47`; `web/src/app/admin/sales/page.tsx:68-74`

## Problem

The live Sales board merges four invented bookings ("Carter wedding", fake totals)
into real leads. They're labelled, but the day real bookings appear they sit beside
real money and will confuse Rita. Decided out (D3).

## Proposed change

Stop appending the fixtures in `listSalesBoard()`, remove the "Example" explainer from
the sales page, and delete the now-unused fixture records (keep `admin-preview.ts`
fixtures still used by the genuinely in-dev preview pages). The board's empty state
(`PlaceholderPanel`) already handles the no-leads case.

## Acceptance criteria (rough)

- [ ] Sales board shows only real `tour_requests`/`bookings` rows
- [ ] Empty board renders the existing empty state, not fixtures
- [ ] CI green

## Prompt

In the agorasim repo (`web/`): `listSalesBoard()` in `web/src/lib/sales.ts` merges
`exampleBookingRecords()` fixtures into the real admin Sales board — remove the merge,
the sales page's example explainer, and the unused fixture code (only what the sales
board used; other admin preview pages keep their fixtures). Read
`.icm/intake/booking-live/remove-example-bookings.md`. PR on a `claude/` branch; no
local checks — CI is the source of truth.
