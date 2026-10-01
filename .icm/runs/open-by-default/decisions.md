# Decisions: open-by-default

The `D-n` ids this run rests on, mirrored from the scope's Decisions table
(`_shared/scope-template.md` → `D-n` ids are permanent), plus any the run itself had to make.
`validate-decisions.sh <slug>` traces the scope's ids into `spec.md` and `notes.md`; this file
is the run's own ledger, so a session need not open the scope to know what was settled and a
decision made mid-run has one home.

## From the scope

- D-1 — Every departure is open unless Diogo & Rita block it. A departure with no entry is open.
- D-2 — Guests can book up to 6 months ahead.
- D-3 — Online bookings need 2 days' notice, counted in calendar days: on a Monday the first bookable day is Wednesday, both departures. Today and tomorrow are never bookable online.
- D-4 — The notice and the window apply to guests booking online only. Diogo & Rita can add a booking (phone, cash) on any day, including today, tomorrow and a blocked day. Capacity still applies.
- D-5 — Blocking works like an Airbnb host calendar: tap one or several days, or the first and last day of a stretch. A bar appears with "Bloquear dia inteiro", "Só manhã", "Só tarde" and "Desbloquear".
- D-6 — Tapping a single day also shows that day's bookings and events, and the "Nova reserva" button, as today.
- D-7 — The driver count and the private note stay, hidden under "Mais opções" in the day panel. The main screen is only open or blocked.
- D-8 — Blocking a day that has bookings is allowed. The bookings stay. The panel warns, e.g. "1 reserva neste dia — continua marcada". Moving or cancelling stays a separate step.
- D-9 — "Abrir tudo", "Abrir fins de semana", the season window, the range-pick button and "Limpar" are removed. A long holiday is blocked by tapping its first and last day.
- D-10 — The guest calendar on /reservar gets an Airbnb-style finish: unavailable days crossed out, two months side by side on a laptop, pick the day then the time (10:00 or 14:00), a clear summary of the choice.
- D-11 — No recurring blocks ("every Monday off") this round.
- D-12 — The scope lands straight on main, as the pipeline does, not on the session branch.

## Made in this run

- <D-n (the next free id) — the decision, why, which stage made it. A decision Build had to
  make is a spec gap: say so in `notes.md` → Notes for Release>
