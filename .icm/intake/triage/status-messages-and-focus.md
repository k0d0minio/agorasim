# Stub: The quote form's success and the cancel page's outcomes are silent to assistive tech

- lane: bug
- found-by: ux lens (/project) · 2026-09-18
- priority: P2

## Problem

On success the quote form swaps itself for a card with no live region and unmounts the
focused submit button, so a screen-reader user hears nothing and lands on `<body>`
(`web/src/components/quote-request-form.tsx:69-83`). The guest cancel page does the same on
"done", and its first step unmounts the tapped button to render the confirm block instead of
moving focus to the safe "Manter" action (`cancel-booking-panel.tsx:66-79,141-162`). WCAG
4.1.3 and 2.4.3 (D14).

## Proposed change

`role="status"` on the success cards; move focus to the confirm block's first action and to
the outcome heading.

## Prompt

In the agorasim repo (`web/`), read `.icm/intake/triage/status-messages-and-focus.md` and add
the status regions and focus moves in `src/components/quote-request-form.tsx` and
`src/components/cancel-booking-panel.tsx`. `git mv` the stub to `_done/` in the PR, on a
`claude/` branch; CI is the source of truth.
