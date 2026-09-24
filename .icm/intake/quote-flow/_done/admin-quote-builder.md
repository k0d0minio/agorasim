# Stub: The quote builder — Rita turns an enquiry into a priced event and sends it

- feature-slug: admin-quote-builder
- scope: quote-flow
- personas: team
- initiative: contracted feature ⑥ complete after launch / objective: a quote leaves the admin in minutes from the enquiry it answers
- priority: P1
- size: L
- depends-on: quote-data-hygiene
- sequence: 2 of 6
- sources: proposal feature ⑥ ("quote per event depending on location"); `web/src/lib/quotes.ts` (`createQuote`, `markQuoteSent`, `splitTotal` 30%, `DEFAULT_DEPOSIT_PERCENT`, `acceptedTermsVersion`) with no caller in `app/` or `components/`; the Sales detail shows only "Data do evento" (`web/src/app/admin/sales/[id]/page.tsx:130`); `web/docs/admin-mobile-design-spec.md` and `.icm/docs/admin-pt-inventory.md` (the admin's rules and words); the purged `quote-flow/admin-quote-builder` stub (2026-08-29)

## Problem

Every wedding and event enquiry ends in a quote written by hand outside the system, so
nothing downstream — the deposit page, the balance job, the 6% fee — can start. The
schema and the state machine exist; Rita has no screen for them.

## Proposed change

On a wedding/event lead's detail: create a quote from the enquiry (event date and venue
prefilled, line items with label and amount, notes, deposit percent defaulting to 30, the
current terms version), edit it while it is a draft, and send it — which stamps
`markQuoteSent`, emails the couple the `quote-sent` message with the link to their quote
page (stub 3 makes the page; this stub sends the link to the route it will live at),
moves the lead to `quoted` and writes the audit row. Show the quote and its two
instalments on the lead detail with their states. Phone-first, Portuguese, the admin's
target and type rules; money entered in euros and stored in cents as the rest of the
admin does.

## Acceptance criteria (rough)

- [ ] From a wedding or event lead, Rita creates, edits and sends a quote without leaving the Sales board; the lead moves to `quoted`; the couple receives the quote-sent email with their link
- [ ] The lead detail shows the quote, its deposit and balance rows and their states; a sent quote is read-only except for a new version
- [ ] Every string from the glossary; ≥44px targets; nothing below 12px; CI green

## Out of scope (this feature)

- The public quote page and any payment (stub 3); refunds (stub 4); capacity (stub 5).
- Quote templates or a price list — bespoke by design.

## Notes for Define

- D20 (quoting by hand until this ships) ends here; D25 fixes the link target as the
  token-gated page.
- Open for Define: a "new version" of a sent quote — supersede-and-resend, or edit in
  place before any payment? Default supersede (the state machine already has versions if
  it has them; check `quotes.ts`).

## Prompt

In the agorasim repo (`web/`), read `.icm/intake/quote-flow/admin-quote-builder.md` and the
breakdown. Build the quote builder on the Sales lead detail (`src/app/admin/sales/[id]/`)
over `src/lib/quotes.ts`: create, edit, send; the quote-sent email in
`src/lib/booking-emails.ts` linking to `/[locale]/orcamento/[token]`; the lead-stage move
and audit row; the quote and instalment rows on the detail. Portuguese from the glossary,
phone-first per the admin spec. Tests for the actions. PR on a `claude/` branch; no local
checks — CI is the source of truth.
