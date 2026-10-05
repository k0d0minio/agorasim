# Stub: Four private copies of the `{key}` template filler

- lane: chore
- found-by: quote-page-and-deposit-link (Release code review) · 2026-09-24
- complexity: low

## Problem

The `{key}` placeholder filler exists as private functions in `web/src/lib/booking-emails.ts`,
`web/src/components/cancel-booking-panel.tsx` and `web/src/app/[locale]/orcamento/[token]/page.tsx`,
plus an exported `fill(template, locale, values)` in `web/src/content/pricing.ts` with a
different signature and semantics (replaces only the given keys; the others leave unknown keys
visible). A fix to one never reaches the rest.

## Proposed change

One exported `fillTemplate(template: string, values)` in a shared util (unknown keys left
visible), used by all four; `content/pricing.ts`'s `fill` becomes a thin wrapper over it. No
behaviour change.

## Prompt

In the agorasim repo (`web/`), read `.icm/intake/triage/fill-helper-consolidation.md` and
replace the private `{key}` fillers with one shared helper, keeping every call's output
identical (the email tests pin most of it). `git mv` the stub to `_done/` in the PR, on a
`claude/` branch; CI is the source of truth.
