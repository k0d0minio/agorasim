# Chore: availability-online-window-tidy

- invariant: behaviour unchanged; `describeSlot` computes the same `onSale`/`bookable`/`hasRoom` for every input. Only where the two calendar bounds are computed differs, and the unused `inOnlineWindow` flag is gone.
- change: `web/src/lib/availability.ts`: added `SaleBounds` / `saleBounds(today)`; `describeSlot` takes optional `bounds` (falls back to computing them) and compares against it; `describeMonth` and `checkDayBookable` compute it once per call; removed `SlotAvailability.inOnlineWindow`.
- change: `web/src/lib/departure-window.ts`: `readDepartureWindow` computes the bounds once for its up-to-366 days.
- change: `web/src/lib/availability.test.ts`: the one assertion that read `inOnlineWindow` now reads `onSale` (`manual-booking.test.ts` and `booking-move.test.ts` never read the flag, so they are untouched).
- rollback: revert the PR; no schema or data involved.
- learned: none
