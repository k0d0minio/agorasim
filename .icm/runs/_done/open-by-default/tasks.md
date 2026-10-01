# Tasks: open-by-default

The queue, with a definition of done per item. Ticked by the stage that finishes the item —
a human checkbox, never a script's. The definition of done is seeded from the spec's
acceptance criteria when the run is opened; the queue is Build's own, one line per commit-sized
step, so a resuming session can pick up the first unticked line.

## Definition of done

- [x] A date with no calendar entry, two or more days out and inside six months, can be booked online, both departures [D-1]
- [x] A blocked departure cannot be booked online; the other departure that day still can
- [x] Online, today and tomorrow (Europe/Lisbon) are refused and the day after is accepted — including just after midnight in Lisbon while UTC is still on the previous day [D-3]
- [x] Online, the last day of the fifth month after this one is accepted and the day after it is refused [D-2]
- [x] The public calendar on `/reservar` shows untouched days inside the online window as available, and today, tomorrow and blocked or full departures as unavailable
- [x] The enquiry form refuses a picked date that is blocked, full, event-held, today, tomorrow or past six months, and still accepts a free-text date
- [x] A manual booking (Calendar day sheet or Sales board) can be added for today, tomorrow or a blocked departure while a driver and the party's car are free, and is refused when they are not [D-4]
- [x] A paid booking can be moved to today, tomorrow or a blocked departure with room; a move into a departure without room is refused
- [x] A day held by a deposit-paid wedding or event is off sale for guests and refused for manual bookings and moves
- [x] An untouched departure with no row has two drivers; a row's stored roster and note still apply
- [x] Every existing closed departure stays blocked with its note; no migration and no row written or deleted by this change
- [x] The admin Calendar shows an untouched departure as on sale (not "sem decisão"), shows today and tomorrow with room as on sale, keeps blocked, full and event-held chips as today, and counts untouched departures in the month's tours left
- [x] Unit tests in `availability.test.ts` cover the open default, the notice (incl. the Lisbon midnight case), the six-month boundary, the block, and the team audience skipping notice, horizon and block but not capacity; the manual-booking and move tests cover the team picker offering a blocked departure; CI green

## Queue

- [x] Pass 1 — the rule: `Audience`, `ONLINE_NOTICE_DAYS`, `ONLINE_BOOKING_MONTHS`, `addDays`, `onlineWindow`, `blocked` / `hasRoom` / `inOnlineWindow` in `lib/availability.ts` + `availability.test.ts`
- [x] Pass 2 — guest paths: checkout `audience: "online"`, enquiry via `checkDayBookable` (online), public calendar (online)
- [x] Pass 3 — team paths: `readDepartureWindow` (team), `createManualBooking` and `moveBookingToDeparture` (team) + manual-booking and move tests
- [x] Pass 4 — interim admin chip, day sheet "Nova reserva" list, month count; admin page reads the month as `team`
- [x] Pass 5 — comments: `db/schema.ts`, module notes, `content/tour-request.ts`, `lib/event-holds.ts`
- [x] Ready flip: draft GREEN → merge `origin/main` → `security-check --branch` → flip → ready push → full GREEN
