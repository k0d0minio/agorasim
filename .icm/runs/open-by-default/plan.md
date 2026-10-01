# Plan: open-by-default

Build's execution plan in passes — each pass one layer of the change, in the order it lands, so
a session that resumes mid-build sees where it is. Written by the advisor pass (Define, or
Build's first act on `sonnet` after reading the spec), executed pass by pass, and rewritten when
reality disagrees with it — never left describing a plan that was abandoned.

## Passes

1. **The rule, pure** — `web/src/lib/availability.ts` + `availability.test.ts`. Introduce the
   audience (`"online" | "team"`, online the default so no caller silently widens) on
   `describeSlot` / `fitsParty` / `checkSlotAvailable` / `describeMonth` / `checkDayBookable`.
   An untouched departure gets `DRIVERS_PER_SLOT`; `closed` is the block; split the result so
   the admin can read "has room" separately from "bookable online" (e.g. `blocked`, `hasRoom`,
   `inOnlineWindow`, `bookable`, `teamBookable` — names are Build's). Online window = today + 2
   calendar days (Lisbon, via `todayKey`) through the last day of `addMonths(monthOf(today), 5)`.
   Rewrite the header note and `CALENDAR_HORIZON_MONTHS`'s comment. — done when: the unit tests
   for open default, notice (incl. 00:30 Lisbon / 23:30 UTC), six-month boundary, block, event
   hold, and team-skips-all-but-room pass in CI.
2. **Guest paths** — `reservar/checkout-actions.ts`, `reservar/actions.ts` (enquiry via
   `checkDayBookable`), `readPublicCalendar`. Online audience everywhere; existing refusal
   copy reused. — done when: `reservar/page.test.ts` and the action tests stay green, and a
   guest refusal for today/tomorrow/past-horizon maps to the existing sentences.
3. **Team paths** — `departure-window.ts` (describes with the team audience or exposes both),
   `manual-booking.ts` (`openDepartures` on team-bookable), `admin/calendar/actions.ts`
   (`createManualBooking` → team), `booking-move.ts` (`viableMoveTargets`, `moveBooking` →
   team) + their tests. — done when: `manual-booking.test.ts` and `booking-move.test.ts` cover
   a blocked departure and a tomorrow departure being offered/accepted, and a full one refused.
4. **Interim admin chip** — `components/admin/availability-calendar.tsx`: `slotChip` /
   `slotSentence` treat `status === null` as open; "esgotada" keys on room, not online
   bookability; the day sheet's "Nova reserva" list and the month's tours-left count use the
   team view (not blocked, not past, room). Header comment's legend drops "sem decisão". No new
   controls. — done when: the preview's Calendar shows untouched days green with a driver
   count, today/tomorrow included.
5. **Comments and the schema note** — `db/schema.ts` availability table comment (no migration),
   module notes in `departure-window.ts`, `manual-booking.ts`, `booking-move.ts`. — done when:
   `grep -rn "Absence is a no\|never been touched\|nobody has opened" web/src` finds no
   statement of the old rule.

## Risks

- **A caller left on the old meaning of `bookable`.** Signal: the admin chip strikes through
  today/tomorrow, or the Sales board picker omits a blocked day. Mitigation: grep every
  `.bookable`, `.onSale` and `status === "open"` read in `web/src` after pass 3.
- **Day arithmetic in UTC.** `today + 2` must be computed on date keys (UTC midnight of the
  Lisbon key), never on `new Date()`. Signal: the midnight test fails.
- **ISR staleness.** `/reservar` is rebuilt hourly, so just after midnight tomorrow may still
  render as bookable; the server re-check refuses it. Accepted here; the picker side is
  `guest-calendar-polish`'s open question.
- **Production goes live with every day open.** Not code: Release adds the runbook line that
  Diogo & Rita block their known days off on production before the promotion.
