# Stub: Focus is invisible on the public custom controls

- lane: bug
- found-by: ux lens (/project) · 2026-09-18
- priority: P2

## Problem

The date picker's day buttons and departure chips remove the outline and rely on
`ring-ring/50` — primary at 50% over the page is ≈2.2:1
(`web/src/components/booking-date-picker.tsx:363,403`). The tour / shared-vs-private /
add-on selector cards (`<button aria-pressed>`) have no `focus-visible` class at all
(`booking-checkout-form.tsx:504-509,554-561,702-709`). WCAG 1.4.11 / 2.4.7 (D14).

## Proposed change

Full-strength focus ring on the picker controls; an explicit `focus-visible` ring on the
selector cards, matching `Button`'s.

## Prompt

In the agorasim repo (`web/`), read `.icm/intake/triage/focus-ring-public-controls.md` and
give the booking picker's day/chip buttons and the checkout's selector cards a visible
focus ring meeting 3:1. `git mv` the stub to `_done/` in the PR, on a `claude/` branch; CI
is the source of truth.
