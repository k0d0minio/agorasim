# Stub: Placeholders sit at ~3:1 in every field

- lane: bug
- found-by: ux lens (/project) · 2026-09-18
- priority: P2

## Problem

Tailwind v4's preflight paints placeholders as `currentcolor` at 50% alpha and nothing in the
repo overrides it (`web/src/components/ui/input.tsx:16`, no `placeholder:` utility anywhere in
`src/`). Foreground at 50% over the background blends to ~3.1:1 — under WCAG 1.4.3's 4.5:1
(D14) and the admin spec's C1. The placeholders carry instructions: "Preço do catálogo" in
the manual-booking dialog (`manual-booking-dialog.tsx:535`), the quote form's examples
(`quote-request-form.tsx:155,193,204`).

## Proposed change

`placeholder:text-muted-foreground` in `fieldBase` (measures ≈5.3:1); confirm with the audit
script the admin spec mentions.

## Prompt

In the agorasim repo (`web/`), read `.icm/intake/triage/placeholder-contrast.md`, set the
placeholder colour in `src/components/ui/input.tsx`'s shared field classes to
`muted-foreground`, and verify the ratio. `git mv` the stub to `_done/` in the PR, on a
`claude/` branch; CI is the source of truth.
