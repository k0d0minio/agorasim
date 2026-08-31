# Stub: Vendas em português — o quadro, o pedido e as ações

- feature-slug: translate-sales
- epic: admin-portugues
- priority: P1
- size: L
- depends-on: translate-shell-and-nav
- sequence: 2 of 7
- sources: D4; ux lens (Rita's dailies, phone-first); `.icm/docs/admin-pt-inventory.md` §1 (the three-names decision), §4.2 ("why it went quiet"), §5.1 `sales/page.tsx` + `sales/[id]/page.tsx` + `actions.ts` (36 messages), §5.2 (`sales-board`, `lead-edit-form`, `lead-quick-actions`, `delete-submission-dialog`, the status selects), §6 (vocabulary shared with the mails), §7

## Problem

The Sales board is the screen Rita opens most, and it is the screen where the English
is worst: one `tour_requests` row is called *enquiry*, *lead* and *booking* within a
single screenful (§1). Translating that as-is would give Portuguese readers three
words for one object, which is worse than the English. This stub is where the
inventory's `pedido` / `reserva` / `orçamento` unification actually lands in code.

## Proposed change

Hardcoded Portuguese across the Sales surfaces, taking every word from the inventory:

- `app/admin/sales/page.tsx` — the count line, the empty state, the retention and
  export chrome. Both the count and the empty state say **pedidos**, not two words.
- `app/admin/sales/[id]/page.tsx` — 20 strings; every "lead" becomes *pedido*.
- `app/admin/actions.ts` — the 36 server-action result messages (§5.1). They render
  verbatim inside `role="alert"` / `role="status"`, so they are UI copy.
- `components/admin/` — `sales-board.tsx`, `sales-stage-pager.tsx`, `lead-edit-form.tsx`
  (including `:245` "why it went quiet", rewritten per §4.2, and `:166`'s empty
  experience option → **Por decidir**), `lead-quick-actions.tsx`,
  `delete-submission-dialog.tsx`, `status-menu.tsx`, `request-status-select.tsx`.
- `lib/experience-icons.ts` — the 20 icon labels and 3 `ENQUIRY_KIND_ICONS` labels
  render as `title` and sr-only text on every board card, so they belong here.

Code identifiers stay English (`AdminLeadPage`, `LeadEditForm`, `lead`) — only
rendered strings change. The `EN-` reference prefix at `lib/sales.ts:77–78` stays as an
opaque identifier (§9.9): it appears on records that already exist and possibly in
messages already sent.

Two coordination notes, neither a blocker:

- `booking-live/remove-example-bookings` (D3) deletes the "placeholder bookings"
  paragraph at `sales/page.tsx:68–74` and the fixtures behind it. Whichever lands
  first, the other translates or deletes what it finds — do not translate a paragraph
  that is already gone.
- The typed-`DELETE` string in `delete-submission-dialog.tsx:103` is translated here
  as prose; the token itself is `delete-token-apagar`'s (stub 6). Leave
  `DELETE_CONFIRMATION` alone.

## Acceptance criteria (rough)

- [ ] Board, detail page, forms, quick actions and all 36 action messages in PT
- [ ] Exactly one word per concept: *pedido* everywhere the object is an enquiry,
      *reserva* only where money has changed hands — grep the surfaces for a second word
- [ ] The vocabulary matches `content/emails.ts` per §6 (reserva, Referência, Partida,
      Experiência, Extras, Pessoas, Cliente)
- [ ] `lib/sales.test.ts:53` (`EN-` prefix) still passes untouched
- [ ] CI green

## Prompt

In the agorasim repo (`web/`), translate the admin Sales surfaces to Portuguese per
`.icm/intake/admin-portugues/translate-sales.md`, taking every word from
`.icm/docs/admin-pt-inventory.md` — §1 decides the vocabulary (one `tour_requests` row
is a **pedido** at every stage before payment, a **reserva** after; never both in one
screen), §4.2 rewrites the "why it went quiet" idiom, §5.1 and §5.2 give the
per-string renderings. Scope: `web/src/app/admin/sales/page.tsx`,
`web/src/app/admin/sales/[id]/page.tsx`, the 36 result messages in
`web/src/app/admin/actions.ts`, `web/src/lib/experience-icons.ts`, and the sales
components (`sales-board`, `sales-stage-pager`, `lead-edit-form`, `lead-quick-actions`,
`delete-submission-dialog`, `status-menu`, `request-status-select`). Rendered strings
only — component, route and variable names stay English, and so does the `EN-`
reference prefix in `web/src/lib/sales.ts`. Do not change `DELETE_CONFIRMATION`
(its own stub). Requires `translate-shell-and-nav` merged — the status and role labels
come from there. Hardcoded PT, no i18n rig (D4). PR on a `claude/` branch; no local
checks — CI is the source of truth.
