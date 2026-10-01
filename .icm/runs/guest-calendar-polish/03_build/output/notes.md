# Build notes: guest-calendar-polish

- commits: feat: guest-calendar-polish — Airbnb-style guest picker on /reservar
- ci: pending (draft head — lint.sh OK, security-check.sh OK)

## What changed

- `web/src/lib/date-keys.ts` (new): the date-key primitives (`DateKey`, `isDateKey`, `dateKey`,
  `BUSINESS_TIME_ZONE`, `todayKey`, `parseDateKey`, `addDays`, `ONLINE_NOTICE_DAYS`) moved out
  of `lib/availability.ts`, which is `server-only`, plus `firstOnlineDay(today)`. Moved, not
  copied: `availability.ts` imports and re-exports them, so every server caller is unchanged and
  `onlineWindow` now reads its first day from `firstOnlineDay` — one count of the notice for the
  browser and the server.
- `web/src/lib/public-calendar.ts` (new, tested): `applyOnlineNotice` (takes days inside the
  two days' notice off sale by the browser's today — only ever removes), `monthPair` (the
  laptop's two months, ending on the last two), `summaryDay` / `summaryLine`.
- `web/src/content/logistics.ts`: `departureClockTimes` (Rural Saloia 10h00/14h00 ·
  10:00/14:00) and `departureShortTime` — the clock time where a tour has one, otherwise
  "manhã/tarde" · "morning/afternoon" (Óbidos). The "put the hours here" note now names both
  records.
- `web/src/content/tour-request.ts`: `calendar.weekdayNames` (PT "Segunda…Domingo" — `Intl`'s
  PT is "quarta-feira"); the hint now reads "Os dias riscados não estão disponíveis." /
  "Crossed-out days are not available." (it claimed only open days were shown); the unused
  `calendar.chosen` label is gone with the old "Dia escolhido:" line.
- `web/src/components/booking-date-picker.tsx`: `useOnlineNotice(months)` —
  `useSyncExternalStore` over the browser clock (server snapshot null, so the prerender and
  hydration agree; re-read once a minute) feeding `applyOnlineNotice`. Unavailable days are
  struck through. Phone: one month (`lg:hidden`); from `lg` (1024 px): two months side by side,
  the left arrow on the first, the right on the second — both rendered, CSS picks one, so no
  layout jump. The day lookup now spans every month (the chosen day can be in the second
  month). The summary line replaces "Dia escolhido: …".
- `web/src/components/booking-checkout-form.tsx`: judges the chosen day against
  `useOnlineNotice(availability)` and passes that same calendar to the picker — the grid and
  the form keep deciding from one calendar by one rule (`departureUsable` untouched).

## Acceptance criteria status

- [x] Unavailable day struck through, disabled (not focusable, no tap) — `line-through` on the
      disabled cell; available days unchanged.
- [x] Two months from 1024 px, one below; one month per press; never past the window —
      `monthPair` clamps to the last two; arrows disable at both ends (tested).
- [x] Checkout: day then departure chips; a departure the party can't take is greyed and
      disabled; one usable departure pre-selected — unchanged behaviour, kept.
- [x] Summary line "Quarta, 14 de outubro · 10h00" / "Wednesday, 14 October · 10:00", "· manhã"
      / "· morning" for Óbidos, day alone before a time and in the enquiry — tested in
      `public-calendar.test.ts` and `logistics.test.ts`.
- [x] 00:30 Lisbon on D with a D−1 payload: D+1 crossed out, D+2 pickable — tested.
- [x] "None of these days work?" unchanged in both forms.
- [x] Picker offers exactly what the server accepts — `applyOnlineNotice` vs
      `isInOnlineWindow` asserted day by day; capacity still `departureUsable`/`slotFitsParty`.
- [x] PT and EN for every new or changed string.

## Notes for Release

- **Enquiry form, uncontrolled day:** the picker now drops a day it holds itself when that day
  is not usable in the calendar (the notice check, or a payload that has it off sale). After a
  rejected enquiry the echoed off-sale day is therefore no longer shown as chosen; the error
  under the calendar still says why. The "flexible" text box is still decided against the day
  as posted, so an echoed date key never turns into free text.
- **Checkout, a restored draft day ruled out by the notice** (a guest back from Stripe after
  midnight): it is dropped, and the existing `partyChanged` line shows ("no longer has a car
  free for this group") — the wording names the party, not the date. Rare (only across
  midnight on a stale page); left as is rather than adding a second message.
- Width to check on the preview: the checkout's left column at exactly 1024 px holds two months
  of ~35 px-wide cells (44 px tall). Check at 1024 and 1280.
- Define committed `status.md` empty (a script truncated it before reading it); Build restored
  it from the pack seed.
