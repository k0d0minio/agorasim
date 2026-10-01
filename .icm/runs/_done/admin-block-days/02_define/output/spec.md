# Spec: Block days the Airbnb way in the admin calendar

- slug: admin-block-days
- personas: team
- touches: web/src/components/admin/availability-calendar.tsx, web/src/app/admin/calendar/page.tsx, web/src/app/admin/calendar/actions.ts, web/src/lib/form-schemas.ts, web/src/lib/availability.ts
- complexity: standard

## Problem

Since `open-by-default` merged (#168), every departure is on sale unless the team blocks it —
but the admin Calendar is still built for the old rule. It offers five ways to open, close and
clear days ("Abrir tudo", "Abrir fins de semana", the season window, "Marcar um período",
"Limpar"), and every tap on a day opens a sheet with a slot picker and a driver stepper. Diogo &
Rita are not technical; all they now need to say is which days they are off. This advances
initiative ③ Instant booking, objective: *the calendar is kept up to date by two non-technical
people from a phone, and guests see every day the business can actually run.* It is stub 2 of 3
in the `open-calendar` scope (D-5 to D-9).

## Proposed change

The admin Calendar (`/admin/calendar`) becomes one gesture — select days, then block or unblock
them — on the Airbnb host-calendar model.

**Selecting days (D-5).** Outside the past, every day tile is tappable:

- The **first tap** selects that day.
- A **second tap on another day** selects every day from the first to the second, inclusive,
  whichever order they were tapped in.
- A **third tap** starts a new selection on the day tapped. Tapping the one selected day again
  clears the selection.
- A selection may **cross a month**: tap the first day, page to the next month with the arrows,
  tap the last day. The first tap survives the paging. The stretch is capped at `MAX_RANGE_DAYS`
  as today.
- Selected tiles are drawn as one highlighted stripe; past days cannot be selected and a stretch
  never includes them (the window starts today).
- There is no mode button: the "Marcar um período" button and its "Cancelar seleção" state are
  gone (D-9).

**The bar.** While anything is selected, a bar is pinned to the bottom of the screen, reachable
one-handed, and the grid above it stays tappable (for the second tap). It shows:

- one summary line: the day or the stretch ("Ter., 3 de out." / "3 a 9 de out. · 7 dias"),
  and the number of live bookings in it when there are any ("· 2 reservas");
- four actions: **Bloquear dia inteiro**, **Só manhã**, **Só tarde**, **Desbloquear**;
- a way to clear the selection;
- with **exactly one day** selected, also **Ver dia**, which opens that day's panel (below).

The four actions **set** the state of every selected day, rather than adding to it:

| Action               | 10:00   | 14:00   |
| -------------------- | ------- | ------- |
| Bloquear dia inteiro | blocked | blocked |
| Só manhã             | blocked | open    |
| Só tarde             | open    | blocked |
| Desbloquear          | open    | open    |

None of them touches a day's driver count or its note: a day with "1 condutor" and a note keeps
both through a block and an unblock (Desbloquear puts the departures back on sale, as "Pôr à
venda" does today). A day with no row that is unblocked stays as it is — open, two drivers.

**Every action asks once.** Tapping an action opens a short confirmation (bottom sheet on a
phone) that names the days and what changes, e.g. "Bloquear 7 dias, de 3 a 9 de out.?". When
the departures about to be **blocked** carry live bookings, it warns and says they stay (D-8):
"1 reserva neste dia — continua marcada" / "3 reservas nestes dias — continuam marcadas". The
count is of bookings in the departures being blocked only (Só manhã on a day whose only booking
is at 14:00 shows no warning), across the whole stretch including another month. Confirming
writes, closes the sheet, clears the selection and refreshes the grid; cancelling leaves the
selection as it was. A failed write says so in the sheet and changes nothing.

**How a day reads (at a glance).** Each tile keeps its two departure chips (10h, 14h), so a day
reads as open (both light green), partly blocked (one red), blocked (both red), held by an event
(dark), or full (solid green, struck) — the states and colours `open-by-default` already draws.
A day's live bookings show on the tile as a small count rather than the current bare dot. The
tile's spoken label and the panel's sentences say "bloqueada" where they said "fechada", to match
the buttons.

**The day panel (D-6, D-7).** "Ver dia" opens the existing responsive sheet for that day, slimmed:

- the day's title and a one-line state of its two departures;
- its events and live bookings, each linking to its lead, as today;
- "Nova reserva", as today (offered on the departures the team can still sell — blocked ones
  included, per D-4);
- a collapsed **Mais opções** section holding the driver stepper ("Condutores em cada partida")
  and the private note ("Nota (só a equipa vê)") with a **Guardar** button. Saving there changes
  the roster and the note of both departures and never their blocked/open state.

The panel has no slot picker and no "Pôr à venda" / "Fechar" / "Limpar estas partidas" buttons
any more; blocking lives in the bar only.

**Removed (D-9).** The month sweeps ("Abrir tudo", "Abrir fins de semana", "Fechar tudo" — the
`BulkActions` card), the season window (`SeasonWindow` card), the "Marcar um período" button and
its range card (`RangeActions`), and "Limpar" (the `clearAvailability` action and its schema).
Code left with no caller goes with them. The month's summary line ("N partidas à venda este mês
· ainda é possível vender N passeios") and the fleet footnote stay; the footnote is rewritten to
match the new states.

**The intro text** above the calendar is replaced by one or two plain sentences, e.g. "Todos os
dias estão abertos a reservas. Para bloquear, toque num dia — ou no primeiro e no último de um
período — e escolha Bloquear."

**Phone.** All of it works one-handed at 320px wide: day tiles stay ≥44px targets in a 7-column
grid, the bar's four actions fit without horizontal scroll (wrapping to two rows is fine), and
nothing needs a drag or a long-press.

Admin Portuguese is taken from `.icm/docs/admin-pt-inventory.md` (partida, condutor, escala,
reserva, Nova reserva, Cancelar); the new verbs **Bloquear / Desbloquear**, **Só manhã / Só
tarde**, **Ver dia** and **Mais opções** are the scope's settled words (D-5, D-7).

## Acceptance criteria

- [ ] On a 320px-wide phone, tapping the 5th, then the 11th, then "Bloquear dia inteiro" and confirming blocks both departures of the 5th through the 11th — three taps and one confirm [D-5]
- [ ] A stretch can cross a month: tap the 28th, page to the next month, tap the 3rd; the bar reads the whole stretch and blocking writes every day of it
- [ ] A third tap starts a new selection on the tapped day; tapping the lone selected day again clears the selection; past days cannot be selected
- [ ] "Só manhã" leaves a selected day with 10:00 blocked and 14:00 on sale; "Só tarde" the reverse; "Bloquear dia inteiro" both blocked; "Desbloquear" both on sale — whatever the day's state before [D-5]
- [ ] Blocking and unblocking leave a day's driver count and note unchanged
- [ ] Every block or unblock asks once; blocking departures that carry live bookings shows "1 reserva neste dia — continua marcada" (or the plural), the bookings stay live, and no warning shows when the blocked departures carry none [D-8]
- [ ] With one day selected, "Ver dia" opens its panel showing its bookings, events and "Nova reserva"; the driver stepper and the note sit under a collapsed "Mais opções" and saving them does not change whether a departure is blocked [D-6, D-7]
- [ ] Each tile reads open, partly blocked, blocked, held by an event or full from its chips, and shows a count when it has live bookings
- [ ] "Abrir tudo", "Abrir fins de semana", "Fechar tudo", the season window, "Marcar um período" and "Limpar" are gone from the screen, and `clearAvailability` is gone from the code [D-9]
- [ ] The intro text above the calendar says, in one or two plain sentences, that every day is open and how to block one
- [ ] The bar's actions fit at 320px without horizontal scrolling and the grid stays tappable while the bar is up
- [ ] CI green

## Out of scope

- Recurring closures, e.g. every Monday (D-11).
- The availability rule itself, the notice and the six-month window (D-1, D-2, D-3) —
  `open-by-default`, merged.
- The guest picker on `/reservar` (D-10) — `guest-calendar-polish`.
- D-12 (where the scope landed) is about the front run, not this feature.
- Selecting scattered, non-adjacent days in one go: they are blocked one day or one stretch at
  a time (settled in Define, 2026-10-01).
- Telling a guest their booked day was blocked; moving or cancelling those bookings (D-8: a
  separate step, unchanged).
- Per-departure roster or note: "Mais opções" sets both departures of the day alike, as the
  sheet's default selection does today.
- Updating `.icm/docs/admin-pt-inventory.md` with the new verbs — a `knowledge edit` after merge.

## Open questions

- none. Settled in Define (2026-10-01), recorded in `decisions.md`: D-13 the Airbnb phone
  gesture; D-14 the bottom bar with "Ver dia"; D-15 "Desbloquear" keeps roster and note; D-16
  every block or unblock asks once; D-17 the bar actions set a day's state.
