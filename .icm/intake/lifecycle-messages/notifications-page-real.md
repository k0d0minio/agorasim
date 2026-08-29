# Stub: The Notifications page tells the truth

- feature-slug: notifications-page-real
- epic: lifecycle-messages
- priority: P1
- size: M
- depends-on: day-before-reminder
- sequence: 6 of 6
- sources: Jamie kept the page (2026-08-29 round 1 — notifications preview NOT dropped); copy lens: `web/src/lib/admin-preview.ts:151-159` shows "Tour reminder / Thank you + review request" as `enabled: true` — fictions the owners will believe; the page consumes fixtures (`web/src/app/admin/notifications/page.tsx:5`)

## Problem

The admin Notifications page previews message kinds as "enabled" that don't exist.
Once real messages flow, the page must show what was actually sent — and until a kind
ships, it must say so honestly.

## Proposed change

Rewrite the page over the message log: a feed of real sends (kind, subject linkage,
when, status) with filters, and a per-kind summary showing genuinely-live kinds vs
"ainda não ativo" for unbuilt ones (SMS). Remove the fixture data and the in-dev
banner; strings in Portuguese (D4). No toggles yet — sends are policy, not switches;
a kill-switch env is enough if wanted.

## Acceptance criteria (rough)

- [ ] Page lists real message-log rows; zero fixtures remain
- [ ] Unbuilt kinds shown honestly; in-dev marker removed from admin-nav for this page
- [ ] Portuguese; mobile-first; CI green

## Prompt

In the agorasim repo (`web/`), make the admin Notifications page real per
`.icm/intake/lifecycle-messages/notifications-page-real.md`: replace the
`admin-preview.ts` fixture rendering in `web/src/app/admin/notifications/page.tsx`
with a feed over the `message_log` table (same epic — must be merged), per-kind
status honest about what ships, Portuguese strings, `dev: false` in
`web/src/lib/admin-nav.ts`. PR on a `claude/` branch; no local checks — CI is the
source of truth.
