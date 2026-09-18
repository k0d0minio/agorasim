# Stub: The manual-booking party steppers overflow a 375px sheet

- lane: bug
- found-by: ux lens (/project) · 2026-09-18
- priority: P1

## Problem

Each stepper is `[44px][32px][44px]` plus gaps (136px) but the phone bottom sheet gives each
of the three columns ~88px after padding, and `Button` is `shrink-0`, so the adults "+" and
the crianças "−" land on top of each other on Rita's phone.
`web/src/components/admin/manual-booking-dialog.tsx:454` (`grid grid-cols-3 gap-2`),
`:92-125`; `web/src/components/ui/dialog.tsx:66`; `web/src/components/ui/button.tsx:16`.
Computed from the classes — confirm with one screenshot at 375×667.

## Proposed change

One row per stepper, as the public checkout's `Stepper` already does
(`booking-checkout-form.tsx:188-221`); ≥44px targets, ≥8px apart (admin spec T1/T3).

## Prompt

In the agorasim repo (`web/`), read `.icm/intake/triage/manual-booking-steppers-overflow.md`
and fix the stepper layout in `src/components/admin/manual-booking-dialog.tsx` so the three
party steppers stack on a 375px sheet with 44px targets. `git mv` the stub to
`.icm/intake/triage/_done/` in the PR, on a `claude/` branch; CI is the source of truth.
