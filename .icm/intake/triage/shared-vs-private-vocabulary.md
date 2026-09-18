# Stub: Per-person versus per-group is named three different ways between the checkout and the receipt

- lane: tweak
- found-by: copy lens (/project) · 2026-09-18
- priority: P2

## Problem

The add-on note says "switch to *Privada*" while the toggle reads "Preço por pessoa / Preço
por grupo" (`web/src/content/booking.ts:119-120` vs `:52-57`,
`booking-checkout-form.tsx:544`); the confirmation email then calls the per-person option
"partida partilhada / shared departure" (`emails.ts:78-79`) after the checkout promised
"O carro é sempre só do vosso grupo" (`booking.ts:54-55`). The admin's "Partilhado /
Privado" is a different speaker and fine.

## Proposed change

One pair of words on the guest side, in both locales, matching the register's rule that no
seats are shared between bookings.

## Prompt

In the agorasim repo (`web/`), read `.icm/intake/triage/shared-vs-private-vocabulary.md` and
align the per-person/per-group wording across `src/content/booking.ts` and
`src/content/emails.ts` in PT and EN. `git mv` the stub to `_done/` in the PR, on a
`claude/` branch; CI is the source of truth.
