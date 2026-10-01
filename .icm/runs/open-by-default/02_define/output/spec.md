# Spec: Every departure is open unless the team blocks it

- slug: open-by-default
- personas: guest, team
- touches: web/src/lib/availability.ts, web/src/lib/availability.test.ts, web/src/db/schema.ts, web/src/lib/departure-window.ts, web/src/lib/manual-booking.ts, web/src/lib/manual-booking.test.ts, web/src/lib/booking-move.ts, web/src/lib/booking-move.test.ts, web/src/app/[locale]/reservar/actions.ts, web/src/app/[locale]/reservar/checkout-actions.ts, web/src/app/admin/calendar/actions.ts, web/src/components/admin/availability-calendar.tsx
- complexity: complex

## Problem

Today a departure with no row in the `availability` table cannot be sold ("absence is a no",
`web/src/lib/availability.ts`). Diogo & Rita must open every day by hand before anyone can
buy it, so a busy week with no time to open days sells nothing — the wrong default for a
business with no fixed days off. This advances initiative ③ Instant booking, objective: *the
calendar is kept up to date by two non-technical people from a phone, and guests see every day
the business can actually run.* It is the first of three stubs in the `open-calendar` scope
and the one the other two (`admin-block-days`, `guest-calendar-polish`) build on.

## Proposed change

**One rule, two audiences.** Every path that asks "can this departure be sold?" keeps asking
`describeSlot` / `fitsParty` / `checkSlotAvailable` in `lib/availability.ts`; those functions
learn who is asking — a **guest online** or **the team** — and answer from one rule.

- **Open by default [D-1].** A departure with no row is open, with the full roster
  (`DRIVERS_PER_SLOT` drivers). A row with `status = 'closed'` is **blocked**. A row with
  `status = 'open'` behaves exactly as an untouched departure, except that its stored `drivers`
  and `note` still apply. `SlotAvailability.status` keeps reporting `null` for an untouched
  departure (the admin can still tell rows from no rows); nothing treats `null` as "not on
  sale" any more.
- **Room.** A departure has room when no deposit-paid wedding or event holds its day, a driver
  is free and some vehicle is free — today's capacity arithmetic, unchanged.
- **Guest online** (checkout, the public calendar, the enquiry form): bookable when the
  departure is not blocked, has room, and falls inside the **online window**:
  - **notice [D-3]:** the date is at least two calendar days after today in Europe/Lisbon
    time (`todayKey`). On a Monday, Wednesday is the first bookable day, both departures;
    today and tomorrow are never bookable online;
  - **horizon [D-2]:** the date is on or before the last day of the month five months after
    today's month — this month and the next five, the months `/reservar` already shows
    (`PUBLIC_CALENDAR_MONTHS = 6`).
- **The team** (the manual booking from the Calendar's day sheet or the Sales board, and the
  weather move): bookable when the departure is today or later and has room. The notice, the
  horizon and the block do not apply [D-4]. An event-held day stays refused (it has no room).
  The manual booking's horizon (180 days) and the move picker's (90 days) are unchanged.
- **Every path, wired to its audience:**
  - `/reservar` checkout (`checkout-actions.ts`) and the public calendar
    (`readPublicCalendar`) — guest online. A refused date reuses the existing "day gone"
    sentence; no new guest copy.
  - The enquiry form (`reservar/actions.ts` → `checkDayBookable`) — **the same rule as the
    checkout** (decided in Define): a picked date that is blocked, full, event-held, today,
    tomorrow or past the six-month horizon is refused with the existing `unavailableDate`
    message. A free-text date ("late August") is still accepted unchecked, and an unreadable
    count still lets the enquiry through, as today.
  - `createManualBooking` (`admin/calendar/actions.ts`), the Sales board picker
    (`listOpenDepartures` in `manual-booking.ts`) and the Calendar day sheet's "Nova reserva"
    list — the team: they offer and accept every departure from today with room, blocked
    ones included.
  - The weather move (`booking-move.ts`: `viableMoveTargets`, `listMoveTargets`,
    `moveBooking`) — **the team, like the manual booking** (decided in Define): a booking may
    be moved to today, tomorrow or a blocked departure while the party's car class and a
    driver are free.
- **The current admin Calendar, until `admin-block-days` replaces it** (chip state and counts
  only, no new controls):
  - an untouched departure renders as on sale (the open chip with its free-driver count), not
    as the dashed "sem decisão" chip, and its spoken sentence says so;
  - the chip follows the **team** view (decided in Define): today and tomorrow with room show
    as on sale, not struck through, since the team can still sell them by phone;
  - a blocked departure keeps its red "fechada" chip; a full one its struck-through chip; an
    event-held one its dark chip;
  - the month's "tours left" count includes untouched departures and leaves blocked ones out.
  - The existing tools stay and keep working: "Abrir…" writes open rows (harmless); "Limpar"
    on a blocked day now returns it to open.
- **No data change.** No migration and no row is written or deleted: every closed departure
  stays blocked with its note, every opened one stays open. Comments that state the old rule
  (`lib/availability.ts` header and `CALENDAR_HORIZON_MONTHS`, the `availability` table comment
  in `db/schema.ts`, `departure-window.ts`, `manual-booking.ts`, `booking-move.ts`) are
  rewritten to the new one.

## Acceptance criteria

- [ ] A date with no calendar entry, two or more days out and inside six months, can be booked online, both departures [D-1]
- [ ] A blocked departure cannot be booked online; the other departure that day still can
- [ ] Online, today and tomorrow (Europe/Lisbon) are refused and the day after is accepted — including just after midnight in Lisbon while UTC is still on the previous day [D-3]
- [ ] Online, the last day of the fifth month after this one is accepted and the day after it is refused [D-2]
- [ ] The public calendar on `/reservar` shows untouched days inside the online window as available, and today, tomorrow and blocked or full departures as unavailable
- [ ] The enquiry form refuses a picked date that is blocked, full, event-held, today, tomorrow or past six months, and still accepts a free-text date
- [ ] A manual booking (Calendar day sheet or Sales board) can be added for today, tomorrow or a blocked departure while a driver and the party's car are free, and is refused when they are not [D-4]
- [ ] A paid booking can be moved to today, tomorrow or a blocked departure with room; a move into a departure without room is refused
- [ ] A day held by a deposit-paid wedding or event is off sale for guests and refused for manual bookings and moves
- [ ] An untouched departure with no row has two drivers; a row's stored roster and note still apply
- [ ] Every existing closed departure stays blocked with its note; no migration and no row written or deleted by this change
- [ ] The admin Calendar shows an untouched departure as on sale (not "sem decisão"), shows today and tomorrow with room as on sale, keeps blocked, full and event-held chips as today, and counts untouched departures in the month's tours left
- [ ] Unit tests in `availability.test.ts` cover the open default, the notice (incl. the Lisbon midnight case), the six-month boundary, the block, and the team audience skipping notice, horizon and block but not capacity; the manual-booking and move tests cover the team picker offering a blocked departure; CI green

## Out of scope

- The new admin blocking screen, the removal of "Abrir tudo", "Abrir fins de semana", the
  season window, the range pick and "Limpar", the day panel's "Mais opções", and the D-8
  warning — D-5, D-6, D-7, D-8, D-9 are `admin-block-days`'s.
- The guest picker's look (D-10) and the hourly-stale-page question (`guest-calendar-polish`).
- D-12 (the scope landed straight on `main`) is a process decision already carried out at
  Scope; it does not apply to this run's code.
- Marking a blocked departure as such in the manual-booking or move pickers — they list it like
  any other; the Calendar day sheet already shows the day's state.
- A distinct guest message for "too soon" or "too far ahead" — the existing "day gone" and
  `unavailableDate` sentences are reused.
- Recurring closures (D-11), capacity changes, event holds, prices, payment, refunds,
  notifying guests whose day is later blocked.
- Blocking the team's known days off on production before the promotion: a runbook line for
  Release (`.icm/docs/launch-runbook.md`), not code.

## Open questions

- none. Decided with the operator in Define on 2026-10-01: the weather move follows the team
  rule like the manual booking; the enquiry form follows the checkout's online rule; the
  interim admin chip follows the team view (today and tomorrow with room show as on sale).
