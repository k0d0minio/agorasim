# Stub: Traduzir o núcleo — nav, dashboard, vendas, calendário

- feature-slug: translate-admin-core
- epic: admin-portugues
- priority: P1
- size: L
- depends-on: admin-i18n-inventory
- sequence: 2 of 4
- sources: D4; ux lens (Rita's dailies: calendar + sales, phone-first); inventory doc from stub 1

## Problem

Rita's daily screens — the bottom-toolbar primaries — are English. These four
surfaces are where the translation pays for itself.

## Proposed change

Hardcode Portuguese (per the inventory + glossary) across: `admin-nav.ts` groups and
labels, the dashboard, the Sales board + booking/lead detail + status menus + contact
templates' UI chrome, and the availability calendar (including PR #31's DayEditor
strings). `admin/layout.tsx` gets `lang="pt"`. Dates/currency format with `pt-PT`
locale (check `lib/admin-format.ts`). The unified vocabulary from the inventory
applies as strings are touched.

## Acceptance criteria (rough)

- [ ] Nav, dashboard, sales, calendar fully PT; `lang="pt"`; pt-PT date/money formats
- [ ] One name per concept per the glossary
- [ ] CI green (including the admin tests that assert on strings — update them)

## Prompt

In the agorasim repo (`web/`), translate the admin core to Portuguese per
`.icm/intake/admin-portugues/translate-admin-core.md`, following the glossary and
renderings in `.icm/docs/admin-pt-inventory.md` (must exist — stub 1 of this epic).
Scope: `web/src/lib/admin-nav.ts`, `web/src/app/admin/page.tsx`, the sales surfaces,
the availability calendar, `admin/layout.tsx` `lang`, and `web/src/lib/admin-format.ts`
locale. Hardcoded PT — no i18n rig (D4 in `.icm/project.md`). Update string-asserting
tests. PR on a `claude/` branch; no local checks — CI is the source of truth.
