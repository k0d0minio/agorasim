# Stub: Three small nits on shipped screens — the footer year, "1 pessoas", "Passeio" for an experience

- lane: tweak
- found-by: copy lens (/project) · 2026-09-18
- priority: P2

## Problem

The footer copyright year is a literal (`web/src/components/site-footer.tsx:30`); the lead
detail prints "1 pessoas" (`admin/sales/[id]/page.tsx:409`); the manual-booking dialog labels
the experience picker "Passeio" where the glossary reserves *passeio* for the enquiry kind and
says *experiência* for the catalogue entry (`manual-booking-dialog.tsx:423` vs
`.icm/docs/admin-pt-inventory.md:113,209`, `lib/admin-format.ts:204`).

## Proposed change

Derive the year; pluralise with the existing formatter; rename the label.

## Prompt

In the agorasim repo (`web/`), read `.icm/intake/triage/small-copy-nits.md` and fix the three
items it cites. `git mv` the stub to `_done/` in the PR, on a `claude/` branch; CI is the
source of truth.
