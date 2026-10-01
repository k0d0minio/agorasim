# Build notes: admin-block-days

- commits: f010f9c feat (the change) · 1d81c04 build notes · 48e7092 merge origin/main (conflict in form-schemas.test.ts imports, resolved)
- ci: GREEN on 31d5390 — full gate: Vercel preview pass; Quality (advisory) success
- ready: 2026-10-01T14:13:42Z — flipped on 1d81c04

## What changed

- `web/src/components/admin/availability-calendar.tsx`: rebuilt around one selection (`Selection`
  `{ anchor, end }`, tap rule `afterTap`), the sticky `BlockBar` (four actions, "Ver dia", clear,
  one confirmation with the D-8 warning) and the slimmed `DayPanel` (events, bookings, Nova
  reserva, "Mais opções" in a `<details>`). Removed `BulkActions`, `SeasonWindow`,
  `RangeActions`, `SweepConfirmation`, `DayEditor`, the range helpers and the props they needed
  (`maxRangeDays`, `today`). The tile's booking dot is now a count; "fechada" reads "bloqueada".
- `web/src/app/admin/calendar/page.tsx`: new intro text; reads `?from=&to=` (validated, not in
  the past) as the initial selection; passes `month`.
- `web/src/app/admin/calendar/actions.ts`: `blockDays` (from/to + block → `setDepartureStates`),
  `saveDayRoster` (drivers + note, never status), `countLiveBookings` (per-departure live
  bookings for a stretch outside the month on screen). `setAvailability` and
  `clearAvailability` deleted.
- `web/src/lib/availability.ts`: `setDepartureStates` (block = upsert `closed`; unblock = update
  only rows that are `closed`; both in one `db.batch`, status only) and `setDayRoster` replace
  `upsertDays` and `clearDays`.
- `web/src/lib/form-schemas.ts` (+ test): `blockDaysSchema`, `dayRosterSchema`, `DAY_BLOCKS`
  replace `setAvailabilitySchema` / `clearAvailabilitySchema`; tests rewritten from the criteria.
- `web/src/lib/audit.ts`, `web/src/lib/admin-format.ts`: new `availability.roster_changed`
  action and label; `availability.closed` now reads "bloqueou dias". `availability.cleared`
  kept for old log lines.
- `web/src/lib/bookings.ts`: `datesWithBookings` deleted (its only caller was "Limpar").
- `web/src/components/admin/manual-booking-dialog.tsx`: two comments pointed at `DayEditor`.

## Acceptance criteria status

- [ ] Three taps and one confirm block a week — tap, tap, "Bloquear dia inteiro", confirm.
  Built; unticked on the PR until seen on a 320px phone.
- [ ] A stretch crosses a month — the selection rides in the URL (`?from=`), the month arrows
  carry it, and the server expands `from`..`to`; the bar counts bookings via `countLiveBookings`. Unticked on the PR until seen on the preview.
- [x] Third tap starts over; tapping the lone selected day clears; past tiles stay disabled and
  the server drops past dates.
- [x] The four actions set the day's state (`BLOCKS` in `actions.ts`, D-17).
- [x] Roster and note untouched by block/unblock — `setDepartureStates` writes `status` only;
  the schema carries neither field (tested).
- [x] Every action confirms once; the warning counts only bookings on blocked departures; the
  confirm waits for the count.
- [x] "Ver dia" (one day selected, in the month on screen) opens the panel; drivers and note
  under a closed "Mais opções"; `saveDayRoster` never writes status.
- [x] Tiles keep their chips and show a booking count beside the day number.
- [x] Sweeps, season window, range button and "Limpar" gone; `clearAvailability` gone.
- [x] Intro text is two plain sentences.
- [ ] Bar: 2×2 grid of wrapping buttons, sticky in flow above the toolbar — built, not yet seen
  at 320px; left unticked on the PR for the operator's smoke (with criteria 1 and 2).
- [x] CI green — see `ci:` above.

## Notes for Release

- `touches:` grew by four files: `lib/bookings.ts` (dead helper), `lib/audit.ts` and
  `lib/admin-format.ts` (the roster audit action), `manual-booking-dialog.tsx` (comments).
- "Ver dia" only shows when the one selected day is in the month on screen (the panel needs that
  month's bookings and events); a first tap carried to another month shows the bar without it.
- Smoke on the preview: the cross-month stretch (tap, arrow, tap), the 320px bar, and "Só manhã"
  on a day with an afternoon booking (no warning) vs "Bloquear dia inteiro" (warning).
- `.icm/docs/admin-pt-inventory.md` still says "fechada" / "Fechar" for the calendar — a
  `knowledge edit` after merge (spec Out of scope).

Context budget: read `lib/bookings.ts` (bookingsBetween), `lib/audit.ts`, `admin-format.ts` and
`manual-booking-dialog.tsx` props beyond `touches:` to wire the count, the audit action and the
panel's booking hand-off.

## Release

- gate: Ready to merge ticked — merge authorised (criteria 1, 2 and 11 were still unticked in the PR body; the operator's Ready tick is taken as the smoke of them)
- ci: GREEN on 5152e38 (ci-status.sh, full gate) — re-read on the post-close-out head before the merge
- reviews: code medium — no findings · security security-check.sh --branch --audit: OK · /security-review n/a — no auth, payments, PII or route policy touched · /production-readiness n/a — no schema, migration or env change (availability writes only), and the skill is not shipped in this session · readiness env.sh audit --changed: OK
- parked: none
- migrations: skip — none of this run's own (check-migrations.sh after merging main: SKIP)
- learned: skip — no error.log
- docs: `.icm/docs/launch-runbook.md` (the two calendar lines now say Bloquear / Ver dia instead of Fechar) · announce: deferred to promotion
- note: `validate-knowledge-map.sh` reads INVALID on `main` too — the proposal PDFs moved to icm-board (D47); not this run's.
- note: main brought in guest-calendar-polish (#172) mid-release, including a `lib/availability.ts` refactor to `lib/date-keys.ts`; merged clean, the helpers this run imports are re-exported.

Context budget: grepped `launch-runbook.md`, `data-protection.md` and business-facts for calendar wording to decide the docs sync.
