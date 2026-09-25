# Spec: "Mensagens automáticas" shows the real message log, in Portuguese, with no fake switches

- slug: notifications-page-real
- personas: team
- touches: web/src/app/admin/notifications, web/src/lib/message-log.ts, web/src/lib/admin-messages.ts, web/src/lib/admin-preview.ts, web/src/lib/admin-nav.ts
- complexity: standard

## Problem

The admin's "Mensagens automáticas" page (`web/src/app/admin/notifications/page.tsx`) renders
English fixtures from `web/src/lib/admin-preview.ts` under the "em construção" banner: invented
sends ("Tour reminder → Laura Bianchi", "Fri 14 Aug"), an on/off switch per template that
switches nothing, and an SMS channel that does not exist (D5 — email-first, SMS post-live). Since
the lifecycle-messages epic shipped the day-before reminder (#124) and the
thank-you (#141), every automatic email the site sends is recorded once in `message_log`, so the
truth exists and the page is the one place it is not shown. This closes contracted feature ⑤
after launch — objective: *the team can see what was sent* — and removes the last English screen
from an admin that D4 makes Portuguese-only.

## Proposed change

The page is rewritten over `message_log`, policy-only (no per-message switch — the purged stub's
decision, kept), Portuguese only, no SMS anywhere. Three sections, top to bottom:

1. **Precisa de atenção** — shown only when non-empty. Sends in the window with `status =
   'failed'`, and sends still `sending` more than 1 hour after `created_at` (the process died
   between the claim and Resend's answer; the mail may have gone — `lib/message-log.ts` module
   note). Each row as in the log (below), with its status badge. These rows also appear in their
   normal place in the log.
2. **As mensagens** — one card per message kind that has a sender on `main`, each saying in one
   line when it goes out and to whom (cliente, equipa, or both), plus how many were sent
   (`status = 'sent'`) in the last 30 days. Kinds with zero sends still show, with 0.
3. **Enviadas recentemente** — every `message_log` row whose send time (`sent_at`, else
   `created_at`) falls in the last 30 days, newest first, grouped under a day heading
   (Europe/Lisbon, `pt-PT` format, e.g. "sexta-feira, 25 de setembro"). Each row: the kind's
   label, the recipient, the reference, the status, the time (HH:MM, Lisbon). No pagination.

**Recipient and reference.** A guest send shows the guest's name from the `tour_requests` row
the log points at (`tour_request_id`); a team send shows "Equipa". The reference is the booking's
(`bookingRef`, `BK-…`) for a row that names a booking, else the pedido's (`enquiryRef`, `EN-…`);
when the row has a `tour_request_id` the reference links to `/admin/sales/<tour_request_id>`. A
row with neither (not expected today) shows "Cliente" and no reference. An erased pedido takes its
log rows with it (cascade), so no row outlives its person. The provider id (`re_…`) is **not**
shown — it expires at 90 days and is not actionable on this screen; it stays in the database and
the Art. 15 export.

**Labels** (admin vocabulary — *reserva*, *pedido*, *orçamento*, *cliente*, *equipa*, *sinal*,
*saldo*, *reembolso* as the admin already says them; the full string list goes to the operator on
the PR preview for a read):

| kind | label | goes out (card line) |
|---|---|---|
| `booking-confirmation` | Confirmação de reserva | Assim que o pagamento é aceite — ao cliente e à equipa |
| `booking-cancellation` | Cancelamento de reserva | Quando uma reserva é cancelada — ao cliente; à equipa quando é o cliente a cancelar |
| `booking-moved` | Mudança de data | Quando muda a data de uma reserva — ao cliente |
| `enquiry-ack` | Pedido recebido | Quando chega um pedido pelo site — ao cliente e à equipa |
| `day-before-reminder` | Lembrete da véspera | Na manhã da véspera do passeio, com o ponto de encontro — ao cliente |
| `thank-you-review` | Agradecimento e avaliação | Na manhã a seguir ao passeio, com o link para a avaliação no Google — ao cliente |
| `quote-sent` | Orçamento enviado | Quando envia um orçamento — ao cliente |
| `deposit-received` | Sinal recebido | Quando o sinal de um orçamento é pago — ao cliente e à equipa |
| `balance-paid` | Saldo pago | Quando o saldo de um orçamento é pago — ao cliente e à equipa |
| `quote-refunded` | Reembolso | Quando devolve dinheiro de um orçamento — ao cliente |
| `balance-request` | Pedido do saldo | (no card — no sender yet) |
| `balance-reminder` | Lembrete do saldo | (no card — no sender yet) |

Build confirms each "to whom" against the sender before shipping the line (the table reflects
`recipient:` at each `sendLoggedEmail` call on `main` today). The label map is exhaustive over
`MessageKind` so `tsc` fails when a kind is added without a label. `balance-request` and
`balance-reminder` get labels (a row of either would render) but no card: they have no sender
until `quote-flow/balance-scheduler` ships, and that stub adds their cards.

**Status badges:** `sent` → "Enviada"; `failed` → "Falhou"; `sending` under 1 hour → "A enviar";
`sending` over 1 hour → "Por confirmar" (sent or not is unknown). **Empty log:** one calm line —
"Ainda não saiu nenhuma mensagem automática nos últimos 30 dias."

**Code shape.** The read is a server-only function beside the writer in `lib/message-log.ts`
(one query: `message_log` left-joined to `tour_requests` for the name, over the window). The pure
parts — kind labels and card lines, the status→badge mapping including the stuck threshold, the
Lisbon-day grouping, the per-kind 30-day counts — live in a new `lib/admin-messages.ts` with unit
tests. The notifications section of `lib/admin-preview.ts` (`PreviewTemplate`,
`previewTemplates`, `previewNotificationLog`) is deleted; the social section stays.
`AdminInDevBanner` comes off this page (the component stays — "Redes sociais" still uses it).
`dev: true` → `false` on the nav entry, which takes the "em construção" marker off the Início
dashboard card; the entry's description is kept.

## Acceptance criteria

- [ ] The page lists real `message_log` rows of the last 30 days, newest first, grouped by Lisbon day — every kind that is logged, including cancellations, date moves and the quote messages; nothing from `admin-preview.ts` renders
- [ ] Each row shows the kind's label, the recipient (guest name from the pedido, or "Equipa"), the reference (`BK-…` for booking rows, else `EN-…`) linked to the pedido in Vendas, the status badge and the time; no provider id
- [ ] "Precisa de atenção" lists failed sends and sends `sending` for more than 1 hour, and is absent when there are none
- [ ] One card per kind with a sender on `main` (ten, not the two balance kinds) gives when it goes out, to whom, and its sent count for the last 30 days, 0 included
- [ ] No switch, toggle or on/off control of any kind; the word SMS appears nowhere on the page
- [ ] Every rendered string is Portuguese in the `.icm/docs/admin-pt-inventory.md` vocabulary and register (singular *você* implicit, sentence case, no exclamation marks); no English remains on the page
- [ ] `AdminInDevBanner` is gone from the page, `dev` is `false` on the `/admin/notifications` nav entry, and the Início card no longer carries the "em construção" marker
- [ ] The notifications fixtures and their type are deleted from `web/src/lib/admin-preview.ts`; nothing imports them
- [ ] Tap targets on the page are ≥44px and no text is below 12px, at phone width
- [ ] Unit tests cover the Lisbon-day grouping (a send at 23:30 UTC in summer lands on the next Lisbon day), the status→badge mapping including the 1-hour stuck threshold, the per-kind counts, and that every `MessageKind` has a label
- [ ] CI green

## Out of scope

- Resending a message, or editing a template, from the admin.
- Per-message on/off switches (policy-only page, decided).
- An SMS or WhatsApp channel (D5).
- The provider id on screen, delivery/open tracking from Resend webhooks.
- Cards for `balance-request` / `balance-reminder` — `quote-flow/balance-scheduler` adds them with their sender.
- Pagination or history beyond 30 days; filtering by kind or status.
- The "Redes sociais" preview page and its fixtures — parked with the social epic (D22); hiding it from the nav is a one-line decision for Jamie (register open question).
- Any schema change — the page reads the existing table and indexes.

## Open questions

- none — the provider-id column, the recipient display, the window and the stuck-send treatment were settled with Jamie in Define (2026-09-25).

Context budget: read the sender call sites for each kind and `content/emails.ts` subjects to fill the "to whom" column and the labels — past the Inputs table, needed to make the card lines true.
