# Stub: Polimento HIG — o que a tradução deixa para trás

- feature-slug: hig-polish-pass
- epic: admin-portugues
- priority: P2
- size: S
- depends-on: delete-token-apagar
- sequence: 7 of 7
- sources: ux lens 2026-08-29 ("the HIG layout pass is substantially already on main" — this is the residue); `web/docs/admin-mobile-design-spec.md` (the repo's own bar, 294 lines, 12 numbered rule groups); D4; `.icm/project.md` constraints ("nothing below 12px")

## Problem

Portuguese runs roughly 20% longer than English, so a translation pass that is correct
word-for-word still breaks layouts: labels truncate, icon-only buttons lose their
meaning at the new lengths, and single-line rows become two. None of that is visible
from the diffs of stubs 1–6, only from the rendered screens on a phone.

## Proposed change

A checklist pass at 375px over every admin screen this epic translated, against
`web/docs/admin-mobile-design-spec.md` — its numbered rule groups (T targets, F type,
C contrast, V safe areas, N navigation, S sheets, E forms, L lists, X states) are the
checklist; no new bar is invented here. Fix in place. Anything structural becomes a
triage stub rather than widening this one.

Two mop-up items belong here rather than to any translation stub:

- **The half-translated console check.** `grep` the surfaces this epic owns for
  surviving English. The preview studios are *not* those surfaces — see the
  breakdown's out-of-scope list — but if one of their owning epics has not landed by
  the time this runs, its `AdminInDevBanner` note is a paragraph of English on a screen
  Rita can reach from a Portuguese nav. Render those notes per inventory §5.1. One line
  each; the rest of each page stays its epic's.
- **Nav label lengths.** `admin-nav.ts` carries `label`, `shortLabel` and `cardTitle`
  for every area. Portuguese may push a bottom-toolbar label past its width where the
  English fitted; that is a `shortLabel` decision, not a re-translation.

## Scope note — the screens that do not exist yet

The version of this stub cut on 2026-08-29 scoped in "the screens other epics touched
(quote builder, notifications)". Neither exists: `quote-flow` has five open stubs and
`lifecycle-messages` six. Sequencing this epic's tail behind two unstarted epics would
strand it indefinitely, so it no longer does. Those surfaces carry their own HIG
obligation — both stubs already cite `web/docs/admin-mobile-design-spec.md` and both
already say Portuguese — and are checked when they are built, not here.

## Acceptance criteria (rough)

- [ ] Every admin screen this epic translated passes the spec's checklist at 375px
      with the Portuguese strings
- [ ] No text below 12px; no touch target below 44px; no horizontal overflow
- [ ] No English paragraph reachable from the Portuguese nav
- [ ] Structural findings parked in `.icm/intake/triage/`, not fixed here
- [ ] CI green

## Prompt

In the agorasim repo (`web/`), run the post-translation HIG polish per
`.icm/intake/admin-portugues/hig-polish-pass.md`, using the numbered rule groups in
`web/docs/admin-mobile-design-spec.md` as the checklist. Audit every admin route at a
375px viewport with the Portuguese strings in place: overflow and truncation from the
longer PT labels, sub-12px text, sub-44px targets, focus order in the dialogs, and
bottom-toolbar `shortLabel` widths in `web/src/lib/admin-nav.ts`. Then grep the
surfaces this epic owns for surviving English — read the breakdown's out-of-scope list
first, because the blog, social, notifications and e-mail-marketing preview pages
belong to other epics; only their `AdminInDevBanner` note is yours, rendered per
`.icm/docs/admin-pt-inventory.md` §5.1. Park anything structural as a triage stub in
`.icm/intake/triage/` rather than widening this PR. Requires stubs 1–6 of this epic
merged. PR on a `claude/` branch; no local checks — CI is the source of truth.
