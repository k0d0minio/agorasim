# Stub: "Complementos" on the site, "Extras" on the receipt; "motorista" in one hint, "condutor" everywhere else

- lane: tweak
- found-by: copy lens (/project), carrying `.icm/docs/admin-pt-inventory.md` §9.7/§9.10 · 2026-09-18
- priority: P2

## Problem

The site sells "Complementos" (`web/src/content/tour-request.ts:31`, `pricing.ts:98`,
`experiencias/page.tsx:126`, `i18n/dictionaries.ts` `labels.complement`) and the receipt
lists "Extras" (`emails.ts:64,296`); the booking calendar hint says "motorista"
(`tour-request.ts:66`) while every other guest surface and the whole admin say "condutor"
(`weddings.ts:22,29,169`, `terms.ts:141,161`). The inventory proposed the fix and parked it
in epics that were purged.

## Proposed change

One word for each thing on the guest side, per the inventory's ruling.

## Prompt

In the agorasim repo (`web/`), read `.icm/intake/triage/complementos-condutor-vocabulary.md`
and apply the inventory's vocabulary across the files it cites, PT and EN in sync. `git mv`
the stub to `_done/` in the PR, on a `claude/` branch; CI is the source of truth.
