# Tweak: notifications-attention-hides-retried

- change: `web/src/lib/admin-messages.ts` (new `attentionRows`, matching `subjectKey`) + `web/src/lib/message-log.ts` (`recentMessages`/`LoggedMessage` now carry the subject columns) + `web/src/app/admin/notifications/page.tsx` (uses `attentionRows` in place of a bare `needsAttention` filter): a `failed` row is left off "Precisa de atenção" once a later `sent`/`sending` row shares its `message_log` claim key (booking, booking+date+move-seq, enquiry, or quote key) → before, every `failed` row stayed listed for the full 30-day window even after a retry under the same claim went out. The row still appears in "Enviadas recentemente" either way.
- changelog: announce: none (this repo keeps no changelog page; project-rules.md → Changelog)
- learned: none
