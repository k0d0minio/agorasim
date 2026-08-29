# Stub: The quote builder — Rita turns an enquiry into a priced event

- feature-slug: admin-quote-builder
- epic: quote-flow
- priority: P1
- size: L
- depends-on: quote-schema
- sequence: 2 of 5
- sources: info PDF §2.3 ("quote per event depending on location"); proposal §5; D9 (terms default); admin conventions (phone-first, `web/docs/admin-mobile-design-spec.md`)

## Problem

Nothing lets Rita price an event. The flow the deal promises: enquiry → quote with a
date, a venue, an amount → deposit request. It must be phone-usable (she works from
her phone) and Portuguese (D4).

## Proposed change

From a wedding/event enquiry on the Sales board: "Criar orçamento" → form (event
date, venue, amount or simple line items, deposit % prefilled 30, terms window
prefilled 30 days), save as draft, then "Enviar" generates the guest-facing quote
page (public tokenised URL — reuse the signed-token pattern) showing the offer,
terms (deposit non-refundable inside the window, free date-change subject to
availability), and the deposit payment button (next stub wires the actual link).
Editing re-versions; the audit log records sends.

## Acceptance criteria (rough)

- [ ] Enquiry → draft quote → sent quote with a public tokenised page, on a phone
- [ ] Terms text renders the window and deposit % from the quote row
- [ ] All new admin strings in Portuguese; guest page PT/EN
- [ ] CI green

## Prompt

In the agorasim repo (`web/`), build the admin quote builder per
`.icm/intake/quote-flow/admin-quote-builder.md` on top of the merged quote schema
(same epic). Admin side: action + form from the Sales board enquiry detail,
`requireAdmin()` first, mobile-first per `web/docs/admin-mobile-design-spec.md`,
strings in Portuguese (the admin is PT — D4 in `.icm/project.md`). Guest side: a
tokenised public quote page (PT/EN) rendering offer, terms (deposit non-refundable
inside the quote's window — default 30 days, D9), and a pay-deposit placeholder the
payment-links stub replaces. PR on a `claude/` branch; no local checks — CI is the
source of truth.
