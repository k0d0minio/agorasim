# Tasks: admin-block-days

The queue, with a definition of done per item. Ticked by the stage that finishes the item —
a human checkbox, never a script's. The definition of done is seeded from the spec's
acceptance criteria when the run is opened; the queue is Build's own, one line per commit-sized
step, so a resuming session can pick up the first unticked line.

## Definition of done

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

## Queue

- [ ] <task — small enough for one commit; name the file or area>
