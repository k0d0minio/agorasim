# Stub: HIG polish — the residue after language

- feature-slug: hig-polish-pass
- epic: admin-portugues
- priority: P2
- size: S
- depends-on: translate-admin-rest
- sequence: 4 of 4
- sources: ux lens 2026-08-29 ("HIG pass substantially on main" — the residue); `web/docs/admin-mobile-design-spec.md` (the repo's own bar)

## Problem

After translation, a short tail of HIG items remains: any labels whose PT rendering
broke a layout (PT runs ~20% longer), icon-only buttons that need labels at the new
lengths, and a final sweep against the repo's own mobile spec (nothing below 12px,
44px targets, one-hand reach) on the screens other epics touched (quote builder,
notifications).

## Proposed change

A checklist pass on a 375px viewport over every admin screen: truncation/overflow
from PT lengths, target sizes, contrast of muted captions, focus order in the new
dialogs, and the spec's rules. Fix in place; anything structural becomes a new triage
stub rather than widening this one.

## Acceptance criteria (rough)

- [ ] Every admin screen passes the spec's checklist at 375px in PT
- [ ] No text below 12px; no target below 44px
- [ ] CI green

## Prompt

In the agorasim repo (`web/`), run the post-translation HIG polish per
`.icm/intake/admin-portugues/hig-polish-pass.md` against the checklist in
`web/docs/admin-mobile-design-spec.md`: audit every admin route at 375px with the
Portuguese strings, fix overflow/truncation, sub-12px text, sub-44px targets, and
focus order regressions. Park anything structural as a triage stub
(`.icm/intake/triage/`). PR on a `claude/` branch; no local checks — CI is the source
of truth.
