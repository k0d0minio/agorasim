# Tasks: admin-quote-builder

The queue, with a definition of done per item. Ticked by the stage that finishes the item —
a human checkbox, never a script's. The definition of done is seeded from the spec's
acceptance criteria when the run is opened; the queue is Build's own, one line per commit-sized
step, so a resuming session can pick up the first unticked line.

## Definition of done

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

## Queue

- [ ] <task — small enough for one commit; name the file or area>
