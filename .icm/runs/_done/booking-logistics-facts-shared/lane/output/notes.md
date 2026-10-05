# Chore: booking-logistics-facts-shared

- invariant: behaviour unchanged; rendered emails identical. Only where the logistics facts, details rows and day-shift are computed differs.
- change: `web/src/lib/booking-emails.ts`: added `bookingLogisticsFacts`, `titleFromCatalogue`, and private `logisticsRows` / `pinLine` used by the confirmation, move and reminder mails (three copies → one).
- change: `booking-checkout.ts`, `booking-move.ts`, `booking-cancellation.ts`, `booking-refund.ts`, `cron/day-before-reminder.ts`, `cron/dispatch-helpers.ts`: build experience / departure / meeting point / add-ons / party label through `bookingLogisticsFacts`.
- change: `shiftDays` moved to `lib/date-keys.ts` (beside `addDays`), re-exported from `lib/availability.ts` and `lib/quotes.ts`; `expandDateRange`, `lastDayOfWindow`, `reminderDays` and `thankYouDays` now use it. Deviation from the stub: it lives in `date-keys.ts`, not `availability.ts` itself, because that module is the primitives' home and `availability.ts` re-exports it; `addDays` stays lenient (returns an invalid key unchanged), `shiftDays` stays strict.
- rollback: revert the PR; no schema or data touched.
- learned: none
