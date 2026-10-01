# Build notes: open-by-default

- commits: feat: open-by-default — open calendar, online window, team audience
- ci: (set at the ready flip)

## What changed

- `web/src/lib/availability.ts`: the rule. A new `Audience` (`online` | `team`, default `online`)
  on `describeSlot`, `describeMonth`, `readMonth` and `checkSlotAvailable`. No row → open with
  `DRIVERS_PER_SLOT`; `closed` → `blocked`. Online = not past, not blocked, inside
  `onlineWindow(today)` (today + `ONLINE_NOTICE_DAYS` = 2 calendar days → last day of the 6th
  month, `ONLINE_BOOKING_MONTHS`); team = not past. Capacity (`hasRoom`: no event hold, a driver,
  some car) binds both. `SlotAvailability` gains `blocked`, `inOnlineWindow`, `hasRoom`;
  `PUBLIC_CALENDAR_MONTHS` now reads `ONLINE_BOOKING_MONTHS`. New pure helpers `addDays`,
  `onlineWindow`, `isInOnlineWindow`. Header and constant comments rewritten.
- `web/src/app/[locale]/reservar/checkout-actions.ts`: re-check as `online` (explicit).
  `reservar/actions.ts`: `checkDayBookable` is the online rule (D-14); comment only.
- `web/src/lib/departure-window.ts`: the window is described for `team`, so the Sales board
  picker (`manual-booking.ts`) and the move picker offer today, tomorrow and blocked days.
- `web/src/app/admin/calendar/actions.ts`: `createManualBooking` re-checks as `team` (D-4).
- `web/src/lib/booking-move.ts`: `moveBookingToDeparture` re-checks as `team` (D-13).
- `web/src/app/admin/calendar/page.tsx` (not in the spec's `touches:` — the page is where the
  admin month is read): `readMonth({ …, audience: "team" })`.
- `web/src/components/admin/availability-calendar.tsx`: chip and sentence key on `blocked` and
  `hasRoom`; the dashed "sem decisão" state is gone; the day sheet's "Nova reserva" offers every
  team-bookable departure (blocked included); the month line counts not-past, not-blocked
  departures. No controls changed.
- Comments only: `web/src/db/schema.ts` (availability table — no migration),
  `web/src/content/tour-request.ts`, `web/src/lib/event-holds.ts` (both stated the old rule;
  outside `touches:`, comment lines only).
- Tests: `availability.test.ts` (open default, roster/note kept, block, notice incl. 00:30
  Lisbon, six-month boundary, team skipping notice/horizon/block but not capacity or event,
  `onlineWindow`, `addDays`; fixtures that assumed "no row = closed" updated);
  `manual-booking.test.ts` and `booking-move.test.ts` (helpers describe as `team`; untouched,
  blocked, today/tomorrow offered; a blocked-and-full departure skipped; the move re-checks with
  `audience: "team"`).

## Acceptance criteria status

- [x] Untouched date, 2+ days out, inside six months, bookable online, both departures — `describeSlot` online + test.
- [x] Blocked departure refused online; the other departure that day unaffected — per-row `blocked`; test.
- [x] Today/tomorrow refused online, the day after accepted, Lisbon midnight case — `onlineWindow` on `todayKey`; tests.
- [x] Last day of the 6th month accepted, the day after refused — test (`2027-01-31` / `2027-02-01` from August).
- [x] Public calendar — `readPublicCalendar` describes as online; smoke on the preview.
- [x] Enquiry form — `checkDayBookable` online; free text unchecked as before; smoke on the preview.
- [x] Manual booking today/tomorrow/blocked with room, refused without — `createManualBooking` + pickers as team; tests on the picker rule.
- [x] Move to today/tomorrow/blocked with room, refused without — team re-check; tests.
- [x] Event-held day refused to both audiences — test.
- [x] Untouched departure has two drivers; a row's roster and note apply — tests.
- [x] No migration, no row written or deleted — the diff touches no migration and no write path.
- [x] Admin calendar chip, sentence, month count — component; smoke on the preview.
- [ ] Unit tests listed in the spec, CI green — written; verdict pending CI.

## Notes for Release

- The guest picker on `/reservar` keeps its look; it now offers every untouched day 2+ days out.
  An hourly-stale page can still show tomorrow as bookable just after midnight — the server
  refuses it (`guest-calendar-polish` owns the picker side).
- "Limpar" on a blocked day now returns it to open — the interim admin's semantics until
  `admin-block-days` removes the button.
- Runbook line owed before promotion: Diogo & Rita block their known days off on production
  (`.icm/docs/launch-runbook.md`), since every untouched day in the next six months goes on
  sale the moment this is promoted.
