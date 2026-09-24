# Tweak: nested-sheets-manual-booking

- change: `web/src/components/admin/availability-calendar.tsx` (`DayEditor`) +
  `web/src/components/admin/manual-booking-dialog.tsx` (`ManualBookingDialog`):
  the day sheet mounted the manual-booking dialog inside its own `DialogContent`,
  so on a phone two 85dvh sheets and two scrims stacked (admin spec S7 breach) →
  `ManualBookingDialog` gained optional `open`/`onOpenChange`/`showTrigger` props;
  the day sheet now hides itself (`open={!bookingOpen}`) while the booking form
  is up, mounting the form as a sibling so it survives the day dialog's own
  `DialogContent` unmounting, and reopens on cancel or once the booking lands.
  The Sales-board mount (`lead-manual-booking.tsx`) is untouched — it stays
  uncontrolled with its own trigger button.
- changelog: announce: none (repo has no changelog page)
- learned: none
