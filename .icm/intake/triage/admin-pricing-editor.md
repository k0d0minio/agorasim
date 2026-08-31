# Stub: New experiences are permanently unsellable — no pricing editor exists

- lane: tweak
- found-by: /project code map · 2026-08-29
- priority: P2
- size: M
- sources: `web/src/app/admin/experiences/actions.ts:106` (`saveExperience` never
  writes `pricing`; still writes the superseded `priceCents` at `:178`);
  `web/src/components/admin/experience-form.tsx` (`describePricing` as read-only
  text); blocks `triage/dead-code-sweep.md`'s `price_cents` drop

## Problem

`saveExperience` (`web/src/app/admin/experiences/actions.ts:106`) never writes
`pricing`, and the experience form shows `describePricing` as read-only text — so an
experience created in the admin can never be priced, and can never sell. The five
seeded entries carry migration-written pricing; anything new is enquiry-only
forever.

## Proposed change

A pricing editor on the experience form: public per-person bands, private tiers,
add-on config — honestly a structured JSON editor with validation against
`ExperiencePricing` is enough for v1 (two operators, rare use). `saveExperience`
persists it; the superseded `price_cents` write is retired in the same pass.

## Prompt

In the agorasim repo (`web/`), add a pricing editor per
`.icm/intake/triage/admin-pricing-editor.md`: extend
`web/src/components/admin/experience-form.tsx` and `saveExperience` in
`web/src/app/admin/experiences/actions.ts` to edit and persist the `pricing` column
(validate against the types in `web/src/lib/pricing.ts`; malformed input rejected
with field errors), stop writing the superseded `price_cents`, and audit the change.
Portuguese strings (the admin is PT — D4 in `.icm/project.md`). PR on a `claude/`
branch; no local checks — CI is the source of truth.
