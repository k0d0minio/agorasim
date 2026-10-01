# Scope: open-calendar

- story: 01_scope/\_source/story.md — the source as received, never edited
- author/source: Jamie (chat)
- personas: team, guest
- agreed: 2026-10-01
- complexity: high
- recommended-model: opus
- stubs: 3 (.icm/intake/open-calendar/)
- canonical: this file, until Define writes spec.md

---

## The story

<!-- Source: Jamie, 2026-10-01, via chat (Claude Code session).
     Recorded as received. Never edited — what was settled on top of it lives in scope.md. -->

We want the calendar UX for Diogo and Rita as well as for customers to be similar to that of Airbnb, the logic of having to manually open calendar days does not make sense. We should have everything open by default and leave Diogo and Rita to blocking off their own days. This UI/UX needs to be way more intuitive, diogo and rita are not very technical so it needs to be simple to use.

---

## Assumptions

- Today a departure nobody has touched cannot be booked. The admin calendar is built around
  opening days: "Abrir tudo", "Abrir fins de semana", a season window, a range pick and "Limpar".
  This scope turns that round. [D-1]
- Departures stay as they are: two a day, 10:00 and 14:00, shared by every tour, two drivers
  across four cars. Capacity rules do not change.
- A departure Diogo & Rita already closed stays blocked, with its note. A departure they already
  opened stays open. No existing entry is lost.
- A deposit-paid wedding or event still takes its whole day off sale, exactly as today.
- The guest is still never told why a day is unavailable.
- The moment this reaches production, every untouched day in the next six months becomes
  bookable. Diogo & Rita must block the days they already know they are off before the
  promotion. They test it first on UAT.
- The six-month window is the six calendar months the guest calendar shows today: this month
  and the next five. Online checkout refuses a date past it.
- Days count in Portuguese time (Europe/Lisbon), as everywhere else in the booking engine.

## Decisions

| ID   | Decision | Why / context | Changes |
| ---- | -------- | ------------- | ------- |
| D-1  | Every departure is open unless Diogo & Rita block it. A departure with no entry is open. | The source: "everything open by default". | Overrides the rule "no entry means not bookable". |
| D-2  | Guests can book up to 6 months ahead. | Matches what /reservar already shows. | no change to the source |
| D-3  | Online bookings need 2 days' notice, counted in calendar days: on a Monday the first bookable day is Wednesday, both departures. Today and tomorrow are never bookable online. | Gives the team time to prepare the cars. | Today a guest can book this morning's tour the same afternoon. |
| D-4  | The notice and the window apply to guests booking online only. Diogo & Rita can add a booking (phone, cash) on any day, including today, tomorrow and a blocked day. Capacity still applies. | The phone call is how a late guest gets a tour. | Today the manual booking only offers open departures. |
| D-5  | Blocking works like an Airbnb host calendar: tap one or several days, or the first and last day of a stretch. A bar appears with "Bloquear dia inteiro", "Só manhã", "Só tarde" and "Desbloquear". | The one gesture a non-technical user has to learn. | no change |
| D-6  | Tapping a single day also shows that day's bookings and events, and the "Nova reserva" button, as today. | They already use the day sheet this way. | no change |
| D-7  | The driver count and the private note stay, hidden under "Mais opções" in the day panel. The main screen is only open or blocked. | Keeps the "one driver only" case and the reason a day is off, without cluttering. | no change |
| D-8  | Blocking a day that has bookings is allowed. The bookings stay. The panel warns, e.g. "1 reserva neste dia — continua marcada". Moving or cancelling stays a separate step. | Blocking only stops new sales. | no change |
| D-9  | "Abrir tudo", "Abrir fins de semana", the season window, the range-pick button and "Limpar" are removed. A long holiday is blocked by tapping its first and last day. | They only exist because days had to be opened. One gesture is simpler. | no change |
| D-10 | The guest calendar on /reservar gets an Airbnb-style finish: unavailable days crossed out, two months side by side on a laptop, pick the day then the time (10:00 or 14:00), a clear summary of the choice. | The source asks for the customer side too. | no change |
| D-11 | No recurring blocks ("every Monday off") this round. | The business has no fixed days off; tapping several days covers it. | no change |
| D-12 | The scope lands straight on main, as the pipeline does, not on the session branch. | Jamie, in session. | no change |

## Out of scope

- Recurring weekly closures (D-11).
- Changing capacity: a third driver, seat sharing, more departures a day.
- How a wedding or event holds the calendar.
- Prices, the checkout payment, cancellations, refunds.
- The enquiry form's own rules beyond what the calendar shows it.
- Notifying guests when a day with their booking is blocked (D-8: the booking simply stays).
- Syncing with Google Calendar or any outside calendar.

## Open for Define

- The weather move ("mover reserva") picks a new departure from the open ones today. Should it,
  like the manual booking (D-4), skip the notice and allow blocked days? Lands in
  `open-by-default`.
- The enquiry form today only accepts a day that is open. Should it also refuse today, tomorrow
  and dates past six months, or keep taking any day as a lead? Lands in `open-by-default`.
- The public page is rebuilt at most hourly, so just after midnight it may still show tomorrow as
  bookable for up to an hour. The server refuses it on submit either way. Is that acceptable, or
  should the picker also check the date in the browser? Lands in `guest-calendar-polish`.
