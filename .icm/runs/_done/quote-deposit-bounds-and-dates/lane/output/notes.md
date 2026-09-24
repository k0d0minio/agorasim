# Tweak: quote-deposit-bounds-and-dates

- change: `lib/quotes.ts` (`createQuote`, `updateQuoteDraft`): a 100% deposit writes no balance
  instalment (was a €0 row the T−14 job would still try to issue) — the quote reaches `paid` the
  moment the deposit does. `lib/quote-builder.ts` + `lib/booking-emails.ts` + `content/emails.ts`:
  the quote-sent email says "Nada — o sinal cobre o valor total" instead of a €0 balance due date.
  `lib/form-schemas.ts` (`quoteDraftSchema`): `eventDate` refuses a day before today. Admin
  `LeadQuoteCard`: the date field gets a `min` of today, and a non-blocking note appears when the
  chosen date falls inside the 14-day balance window (warn, not refuse — decided with Jamie).
- changelog: not warranted (admin-only fix; announce: none — this repo has no changelog page)
- learned: none
