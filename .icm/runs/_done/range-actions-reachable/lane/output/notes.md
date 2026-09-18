# Tweak: range-actions-reachable

- change: web/src/components/admin/availability-calendar.tsx: the range card rendered
  below the fold at 375×667 with the stripe as its only feedback → it is pinned above the
  bottom toolbar while a stripe is picked (sticky, in flow, `md:static`, the `FormActionBar`
  shape) and a mounted `role="status"` region announces the pick; both say the one
  `rangeSummary()` sentence.
- changelog: announce: none
