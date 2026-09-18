# Stub: One "(opcional)" convention across the public forms, and errors tied to their fields

- lane: tweak
- found-by: ux lens (/project) · 2026-09-18
- priority: P2

## Problem

The quote form marks only phone and party size optional although date, venue, hours, car and
message are too (`web/src/components/quote-request-form.tsx:134-137,184-186` vs
`:141,151,160,172,199`); the checkout marks nothing. No input anywhere carries
`aria-invalid`/`aria-describedby` (grep: none) — errors are `role="alert"` paragraphs, so
they announce, but are not tied to the field. WCAG 3.3.1/3.3.2; admin spec E1/E6 for the
same pattern in `manual-booking-dialog.tsx:156-163`.

## Proposed change

Mark every optional field the same way on both forms; `aria-invalid` + `aria-describedby` to
the error paragraph on the shared field components.

## Prompt

In the agorasim repo (`web/`), read `.icm/intake/triage/optional-marking-and-aria.md` and
apply the convention and the aria wiring across `quote-request-form.tsx`,
`booking-checkout-form.tsx` and the shared field components. `git mv` the stub to `_done/`
in the PR, on a `claude/` branch; CI is the source of truth.
