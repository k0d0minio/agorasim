# Plan: admin-block-days

Build's execution plan in passes — each pass one layer of the change, in the order it lands, so
a session that resumes mid-build sees where it is. Written by the advisor pass (Define, or
Build's first act on `sonnet` after reading the spec), executed pass by pass, and rewritten when
reality disagrees with it — never left describing a plan that was abandoned.

## Passes

1. **Server actions** — `web/src/app/admin/calendar/actions.ts`, `web/src/lib/form-schemas.ts`.
   One block action that takes the selected dates (or a `from`/`to` stretch) plus which
   departures end blocked and which open (the four bar actions map onto `setAvailability`
   writes per slot — closed for the blocked ones, open for the others — posting **no**
   `drivers`/`note` so `upsertDays` leaves both alone). A roster-and-note save for "Mais opções"
   that writes `drivers` + `note` for both departures and keeps each departure's current status
   (an untouched departure gets `open`). A read that counts live bookings in given departures
   across a date range (for the confirm's warning, which may cross a month — reuse
   `bookingsBetween` / `datesWithBookings` in `lib/bookings.ts`). Delete `clearAvailability`
   and `clearAvailabilitySchema`; delete `clearDays` in `lib/availability.ts` if nothing else
   calls it. Keep `availability.cleared` in `lib/audit.ts` / `admin-format.ts` — old audit
   lines still need their label. — done when: `manual-booking.test.ts` stays green and grep
   finds no caller of the removed exports.
2. **Selection and the bar** — `availability-calendar.tsx`. Replace `selected` / `rangePicking`
   / `rangeAnchor` / `range` with one selection state (`{ from, to } | null`): first tap, second
   tap → sorted stretch, third tap → new single day, tap on the lone selected day → null. It
   must survive month paging (client state already survives a `?month=` navigation in the App
   Router; if it does not on the preview, carry the anchor in the URL). Stripe styling across
   tiles; past tiles stay disabled. A fixed bottom bar (safe-area inset, above the PWA home
   indicator) with the summary line, the four actions, clear, and "Ver dia" when `from === to`.
   — done when: at 320px the bar's actions fit without horizontal scroll and the grid behind it
   still takes the second tap (pad the page bottom by the bar's height).
3. **Confirm sheet** — one confirmation component on the shared responsive `Dialog`, reusing
   the `Confirming<T>` / `stillAsking` pattern: names the days and the change, fetches the
   booking count for the departures being blocked (none for Desbloquear), shows "N reserva(s)
   neste(s) dia(s) — continua(m) marcada(s)", writes, clears the selection, `router.refresh()`.
   — done when: blocking a day with a 14:00 booking via "Só manhã" shows no warning and via
   "Bloquear dia inteiro" shows one.
4. **Day panel** — slim `DayEditor` into the "Ver dia" sheet: title + state line, `DayEvents`,
   `DayBookings`, "Nova reserva" (unchanged `ManualBookingDialog` hand-off), and a collapsed
   "Mais opções" (native `<details>` or a disclosure button) with the stepper, the note and
   "Guardar". Remove the slot picker, "Pôr à venda", "Fechar", "Limpar estas partidas". — done
   when: saving "Mais opções" on a blocked day leaves it blocked.
5. **Tiles, copy and removals** — booking dot → small count; `slotSentence` / labels say
   "bloqueada"; delete `BulkActions`, `SeasonWindow`, `RangeActions`, `SweepConfirmation`,
   `sweepable`, `rangeSummary` and whatever else loses its caller; drop `maxRangeDays` /
   `defaultDrivers` props if unused; rewrite the intro paragraph in `page.tsx` and the fleet
   footnote; rewrite the component's header comment for the new model. — done when: none of
   "Abrir tudo", "Abrir fins de semana", "Fechar tudo", "Marcar um período", "Limpar" appears
   under `web/src/components/admin/availability-calendar.tsx` or `web/src/app/admin/calendar/`.

## Risks

- **Bar covers the grid on a short phone** — the last week row hides behind the bar; signal:
  the 5th-row tiles cannot be tapped at 320×568. Pad the scroll area by the bar height.
- **Cross-month selection lost on paging** — signal: the bar disappears after tapping the
  month arrow. Fallback: anchor in the URL (`?month=…&from=…`).
- **A partial block over a stretch with mixed rosters** — the write must not post `drivers`;
  signal: an audit line with `drivers` after a bar action.
- **Admin `lint.sh` / ESLint unused-symbol errors** after the removals — run `lint.sh` before
  each push.
