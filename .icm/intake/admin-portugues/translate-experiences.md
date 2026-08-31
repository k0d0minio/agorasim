# Stub: O catálogo em português — experiências, preços e imagens

- feature-slug: translate-experiences
- epic: admin-portugues
- priority: P1
- size: M
- depends-on: translate-shell-and-nav
- sequence: 3 of 7
- sources: D4; `.icm/docs/admin-pt-inventory.md` §5.1 (`experiences/*`, `experiences/actions.ts` — 13 messages), §5.2 (`experience-form.tsx` 29, `experience-image-field.tsx` 7, `experience-row-actions.tsx` 8), §9 defects 1 and 2; `web/src/lib/pricing.ts:320–322` (the "English only, like the rest of the admin" comment this epic retires)

## Problem

The catalogue editor is the second-largest body of English in the console — a
522-line form, its image field, its row actions and 13 server-action messages, about
70 strings in all. It also carries the two copy defects the inventory found and
deliberately parked: a screen that tells Rita to run a SQL migration, and a label
that names a table removed when the three sales screens collapsed into one board.

## Proposed change

Hardcoded Portuguese over `app/admin/experiences/**` and its components, taking the
renderings from the inventory:

- `experiences/page.tsx`, `experiences/[id]/page.tsx`, `experiences/new/page.tsx`
- `experiences/actions.ts` — the 13 result messages
- `components/admin/experience-form.tsx`, `experience-image-field.tsx`,
  `experience-row-actions.tsx`
- `lib/pricing.ts` `describePricing()` — the whole price list in one operator-readable
  sentence, now in Portuguese; delete the "English only, like the rest of the admin"
  line from its doc comment, which this epic makes false.

The two parked defects are fixed here rather than translated faithfully, because
translating them would make both *more* prominent:

- `experiences/page.tsx:74–77` tells the operator to run
  `drizzle/0008_seed_experience_catalogue.sql`. That is a developer instruction on a
  screen Rita uses. It becomes "o catálogo ainda não foi criado — avise o Jamie", or
  words to that effect: a copy rewrite, not a translation.
- `experience-form.tsx:165` says the icon shows "on the Sales board **and table**".
  The table was removed when the three screens became one board (see the doc comment
  on `app/admin/sales/page.tsx`). The string is already stale in English; §5.2's PT
  rendering drops the clause.

Pricing stays a read-only sentence — the editor itself is
`.icm/intake/triage/admin-pricing-editor.md`, not this stub.

## Acceptance criteria (rough)

- [ ] Every string under `app/admin/experiences/**` and the three experience
      components in PT, per the inventory
- [ ] `describePricing()` returns Portuguese; its "English only" comment is gone
- [ ] No screen instructs the operator to run a migration
- [ ] The stale "and table" clause is gone, not translated
- [ ] `DELETE_CONFIRMATION` untouched (stub 6 owns it)
- [ ] CI green

## Prompt

In the agorasim repo (`web/`), translate the admin catalogue to Portuguese per
`.icm/intake/admin-portugues/translate-experiences.md`, taking the renderings from
`.icm/docs/admin-pt-inventory.md` §5.1 and §5.2 rather than translating afresh. Scope:
`web/src/app/admin/experiences/**` (pages plus the 13 messages in `actions.ts`),
`web/src/components/admin/experience-form.tsx`, `experience-image-field.tsx`,
`experience-row-actions.tsx`, and `describePricing()` in `web/src/lib/pricing.ts`
(also drop the now-false "English only" line from its doc comment). Two strings are
rewrites rather than translations — read §9's defect list in the inventory: the
"run the catalogue migration" instruction at `experiences/page.tsx:74–77` becomes
plain operator copy, and the stale "and table" clause at `experience-form.tsx:165` is
dropped. Do not change `DELETE_CONFIRMATION` (its own stub). Requires
`translate-shell-and-nav` merged. Hardcoded PT, no i18n rig (D4). PR on a `claude/`
branch; no local checks — CI is the source of truth.
