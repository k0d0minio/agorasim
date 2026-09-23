# Spec: The quote builder — Rita turns a wedding or event enquiry into a priced, sent quote

- slug: admin-quote-builder
- personas: team
- touches: web/src/app/admin/sales, web/src/components/admin, web/src/lib/quotes.ts, web/src/lib/booking-emails.ts, web/src/lib/message-log.ts, web/src/lib/cancellation-token.ts, web/src/db/schema.ts, web/drizzle, web/src/content/terms.ts, web/docs/guia-telemovel.md
- complexity: complex

## Problem

Every wedding and event enquiry that reaches the Sales board ends in a quote Rita writes by
hand outside the system (D20), so nothing downstream — the token-gated quote page and its
deposit (D25), the T−14 balance job, the 6% fee on each instalment — can start. The quote
schema and its state machine shipped in #78 and were hardened in #111; nothing in `app/` or
`components/` calls them. This advances contracted feature ⑥ (proposal §5, "quote per event
depending on location"): the objective is a quote that leaves the admin in minutes from the
enquiry it answers.

## Proposed change

On the Sales detail of a lead whose `kind` is `wedding` or `event` (tour leads are unchanged),
a **Orçamento** card lets Rita build, send and replace a quote without leaving the board.

- **Create.** "Criar orçamento" opens a draft prefilled from the enquiry: the event date (the
  lead's `preferred_date` when it is a `YYYY-MM-DD` day, otherwise empty and required), the
  venue (the lead's `venue`), the quote's language (the lead's `locale`), deposit 30%
  (`DEFAULT_DEPOSIT_PERCENT`, editable 1–100). The non-refundable window stays at the D9
  default (30 days) and is not shown. A lead holds **at most one draft and at most one sent
  quote** at a time; "Criar orçamento" appears only when it has neither.
- **Line items.** One or more lines, each a label, a quantity (default 1) and a unit price
  typed in euros and stored in cents, as the rest of the admin does. The **total is the sum of
  the lines**, computed and shown live together with the deposit and balance it splits into
  (`splitTotal`) and the balance due date (event date − 14). There is no separate total field
  and no notes field — the labels carry the explanation, the lead's internal notes stay
  Rita's.
- **Edit / discard.** A draft is editable (`updateQuoteDraft`, drafts only) and can be
  discarded ("Descartar rascunho" → `cancelQuote`, with a confirmation).
- **Send.** "Enviar orçamento" on a draft:
  1. stamps the current terms version — a single `TERMS_VERSION` constant exported beside the
     terms content (the ISO date of its "last updated", `2026-09-10` today), so the version and
     the date the guest reads cannot drift apart;
  2. mints a fresh access token (32 random bytes, stored only as an HMAC digest like the
     booking cancel token; **no new environment variable**) and calls `markQuoteSent`, which
     moves the lead to `quoted` and writes its `tour_request.status_changed` audit row;
  3. cancels any other `sent` quote of the same lead — this is how a new version supersedes
     the old one, and the old link stops working at that moment — with an audit row on the
     lead naming both quote refs;
  4. emails the couple the `quote-sent` message in the quote's language: the event date, the
     venue, each line, the total, the deposit, the balance and its due date, and the link to
     `/<locale>/orcamento/<token>` (the page is stub 3's; D25), logged in `message_log`.
- **Send failure / wrong address.** If the email fails the quote stays `sent` and the card
  says so ("O email não foi enviado"). "Reenviar" on a sent quote rotates the link (a new
  token through `markQuoteSent`'s `sent → sent`) and emails the new link; the old one dies. It
  is the same action for a failed send and for a quote that went to a mistyped address after
  the lead's email is corrected.
- **New version.** "Nova versão" on a quote whose status is `sent` (no instalment paid)
  opens a new draft copied from it — date, venue, lines, deposit percent. The sent quote stays
  valid until the new version is sent (step 3 above). Once a quote is `deposit_paid` or
  `paid` it has no "Nova versão": changing paid money is the refunds stub's path.
- **Showing it.** The card lists the lead's quotes newest first: reference (`quoteRef`),
  status (Rascunho / Enviado / Sinal pago / Pago / Cancelado — a superseded quote reads
  "Substituído"), event date, venue, lines, total, when it was sent and under which terms
  version, and its two instalment rows — Sinal and Saldo — each with its amount, due date
  (the balance's) and state. A sent, paid or cancelled quote is read-only.
- **The one message per send.** `message_log`'s enquiry-shaped uniqueness keys `quote-sent`
  on the lead today, which would refuse a second version's email to the same couple. The
  `quote-sent` log row is keyed on the quote and the link it carries instead, so each send
  (first send, Reenviar, a new version) emails exactly once, a double tap never emails twice,
  and a failed attempt can be retried. The key is Build's design; it lands as a migration and
  keeps the log row inside the lead's cascade erasure.
- **Words and layout.** Every admin string from `.icm/docs/admin-pt-inventory.md`
  (**orçamento**, the `quoted` stage as **Orçamentado**); phone-first per
  `web/docs/admin-mobile-design-spec.md`: ≥44px targets, nothing below 12px, Portuguese only
  (D4). The phone guide `web/docs/guia-telemovel.md` gains the quote card in the same PR.

## Acceptance criteria

- [ ] On a wedding or event lead, Rita creates a draft quote prefilled with the enquiry's venue, language and (when it is a calendar day) date, with deposit 30%; a tour lead shows no Orçamento card
- [ ] Line items take a label, a quantity and a unit price in euros; the total, deposit, balance and balance due date update as she types and are stored in cents; a draft with no line, a zero total or no event date cannot be saved, and the reason is shown
- [ ] A draft can be edited and discarded; a sent, paid or cancelled quote shows no edit control
- [ ] Sending a draft stamps `TERMS_VERSION`, stores only the token's digest, moves the lead to Orçamentado with a Histórico entry, and emails the couple once, in the quote's language, with the amounts and a `/<locale>/orcamento/<token>` link
- [ ] A failed email leaves the quote sent and says so on the card; "Reenviar" rotates the link and emails once more, and the previous link's digest no longer matches the quote
- [ ] "Nova versão" on a sent quote opens a copied draft; sending it cancels the previous sent quote (shown as Substituído, its link dead) and emails the new one; a lead never holds two sent quotes or two drafts at once; a deposit-paid or paid quote offers no Nova versão
- [ ] The card shows each quote's reference, status, date, venue, lines, total, sent date, terms version and its Sinal and Saldo rows with amounts, due date and state
- [ ] A second version's `quote-sent` email is not refused by the message log, a double submit sends once, and a failed attempt can be retried; deleting the lead still deletes its message log rows
- [ ] Unit tests cover the create/edit/send/re-send/new-version actions (guards, lead stage, supersede, single send) and the email's content in PT and EN
- [ ] Every new admin string is from the glossary; targets ≥44px, nothing below 12px; the phone guide describes the card; CI green

## Out of scope

- The public quote page at `/[locale]/orcamento/[token]`, minting any Checkout session, and recording any payment — `quote-page-and-deposit-link` (stub 3). **Until stub 3 ships the emailed link 404s; accepted by the operator (2026-09-23): this stub may promote to production on its own, and Rita keeps quoting by hand (D20) for real couples until stub 3 lands.**
- Refunds and write-offs of instalments from this card (stub 4); capacity holds (stub 5); the T−14 balance session and its chaser (stub 6).
- A couple-facing notes field on the quote (dropped, operator 2026-09-23) and a `supersedes` link column (the audit row names the replaced quote instead).
- Quote templates, a price list, package or tier pricing — bespoke by design.
- Editing the non-refundable window (stays at D9's 30 days) or the currency.
- A team copy of the quote-sent email.

## Open questions

- none. Settled with the operator 2026-09-23: supersede-and-resend for a new version (the stub's default), no notes field, total = sum of the lines, the 404 window before stub 3 accepted.

Context budget: `quotes.ts`, the `quotes`/`message_log` schema and the Sales detail's imports were read to settle the new-version and message-uniqueness questions — past the Inputs table, recorded here.
