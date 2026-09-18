# Stub: "Mensagens automáticas" tells the truth — the real log, in Portuguese, no fake switches

- feature-slug: notifications-page-real
- scope: lifecycle-messages
- personas: team
- initiative: contracted feature ⑤ complete after launch / objective: the team can see what was sent
- priority: P2
- size: M
- depends-on: thankyou-review-email
- sequence: 4 of 4
- sources: copy lens 2026-09-18 — `web/src/app/admin/notifications/page.tsx:26-29,33,44,84` renders `previewNotificationLog` / `previewTemplates` (`web/src/lib/admin-preview.ts:47-58`) in English under `AdminInDevBanner` ("Message templates", "Tour reminder · Email, SMS", "Delivered", "Fri 14 Aug"); `web/src/lib/admin-nav.ts:165-180` (`dev: true`); D4 (Portuguese only), D5 (no SMS); data lens — `message_log` holds every send once stubs 1–3 land; the purged `notifications-page-real` stub decided policy-only, no per-template switches

## Problem

Rita's nav offers a page that shows invented English messages, an "enabled" switch that
switches nothing, and an SMS channel that does not exist. Once the reminder and thank-you
ship, the truth is in `message_log` and the page should show it.

## Proposed change

Replace the fixtures with the log: recent sends grouped by day (kind in the glossary's
words, recipient, booking reference, status, provider id while it lives), a per-kind
description of when each message goes out and to whom, no toggles (policy-only, as
decided), no SMS column, Portuguese throughout on the admin glossary; the `dev` flag and
the banner come off; the dashboard card follows. Rate of sends per kind for the last 30
days is enough of a summary.

## Acceptance criteria (rough)

- [ ] The page lists real `message_log` rows for every kind incl. cancellations and moves (stub 1); no fixture, no toggle, no SMS
- [ ] Every string is from `.icm/docs/admin-pt-inventory.md`'s vocabulary; the `dev` flag and `AdminInDevBanner` are gone; ≥44px targets, nothing below 12px
- [ ] CI green

## Out of scope (this feature)

- Resending a message from the admin; editing templates in the admin.
- The "Redes sociais" preview page — parked with the social epic (D22); hiding it from
  the nav is a one-line decision for Jamie (register open question).

## Notes for Define

- Policy-only page: no per-template kill switch (purged stub's decision, kept).
- Open for Define: whether the provider id column is worth showing at all given its
  90-day retention.

## Prompt

In the agorasim repo (`web/`), read `.icm/intake/lifecycle-messages/notifications-page-real.md`
and the breakdown. Rewrite `src/app/admin/notifications/page.tsx` over `message_log`
(query in `src/lib/message-log.ts`), Portuguese only from the glossary, no toggles, no SMS;
remove the fixtures it used from `src/lib/admin-preview.ts` and the `dev` flag in
`src/lib/admin-nav.ts`. Tests for the grouping and the kind labels. PR on a `claude/`
branch; no local checks — CI is the source of truth.
