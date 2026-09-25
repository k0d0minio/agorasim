# Plan: notifications-page-real

Build's execution plan in passes — each pass one layer of the change, in the order it lands, so
a session that resumes mid-build sees where it is. Written by the advisor pass (Define, or
Build's first act on `sonnet` after reading the spec), executed pass by pass, and rewritten when
reality disagrees with it — never left describing a plan that was abandoned.

## Passes

1. **The pure layer** — new `web/src/lib/admin-messages.ts` + `admin-messages.test.ts`: the
   exhaustive `Record<MessageKind, …>` of labels, the card list (ten kinds with a sender; order as
   in the spec table), the status→badge mapping with the 1-hour stuck threshold, the Lisbon-day
   grouping (reuse `lib/admin-format.ts` date helpers where they already speak `pt-PT` /
   Europe/Lisbon), the per-kind 30-day sent counts. Confirm each card's "to whom" against the
   `recipient:` at every `sendLoggedEmail` call site before writing the line. — done when: the
   tests cover every criterion the spec names for them.
2. **The read** — a server-only reader in `web/src/lib/message-log.ts`: one query over the last
   30 days, `message_log` left-joined to `tour_requests` for the name, returning the rows the pure
   layer needs (kind, recipient, status, booking id, tour request id, name, sent_at, created_at).
   No provider id selected. — done when: the page can be built from its return value alone.
3. **The page** — rewrite `web/src/app/admin/notifications/page.tsx`: "Precisa de atenção"
   (only when non-empty), the kind cards with counts, "Enviadas recentemente" grouped by day, the
   empty-state line; references via `bookingRef` / `enquiryRef` linked to `/admin/sales/<id>`;
   no banner, no switch, no SMS; ≥44px targets, nothing below 12px. — done when: no English and
   no `admin-preview` import remain in the file.
4. **The cleanup** — delete the notifications section of `web/src/lib/admin-preview.ts` (type +
   two arrays) and fix its header comment; `dev: false` on the `/admin/notifications` entry in
   `web/src/lib/admin-nav.ts`. Grep for any other importer of the deleted names. — done when:
   `grep -r "previewTemplates\|previewNotificationLog\|PreviewTemplate" web/src` is empty.

## Risks

- **A card line that lies about who gets a message** — the spec table was read from the call
  sites on 2026-09-25; a sender changed since would make it wrong. Signal: pass 1's check
  disagrees with the table → fix the line and note it in `notes.md`.
- **Day grouping off by one around midnight** — UTC vs Lisbon (UTC+1 in summer). Signal: the
  23:30 UTC test fails.
- **A kind added later without a label** — prevented by the exhaustive `Record`; `tsc` fails.
- **`balance-request` / `balance-reminder` cards** — deliberately absent; `quote-flow/balance-scheduler`
  adds them. Do not add them here.
