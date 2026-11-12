# Stub: The wedding and event forms show the date as day, month, year

- lane: bug
- found-by: feedback round 2 ("the wedding date is displayed in the wrong order") · 2026-11-12
- complexity: low
- priority: P1

## Problem

The date field on `/casamentos` and `/eventos` is a native `<input type="date">`
(`web/src/components/quote-request-form.tsx`). The browser draws it in the browser's own locale,
not the page's. A browser in US English shows MM/DD/YYYY on the PT page. The team email prints
the raw value `2027-06-12` (`teamEnquiryEmail`, `web/src/lib/booking-emails.ts`).

## Proposed change

The field shows and accepts the date as DD/MM/AAAA on the PT page and DD/MM/YYYY on the EN page,
in every browser. The team email shows the date in words, as the booking emails do.

## Acceptance criteria

- [ ] In Chrome with the browser language set to English (US), `/pt/casamentos` shows the date field as DD/MM/AAAA.
- [ ] `/en/casamentos` shows DD/MM/YYYY in the same browser.
- [ ] The value saved in `tour_requests.preferred_date` stays `YYYY-MM-DD`.
- [ ] The field refuses a date in the past, as today.
- [ ] The team enquiry email shows the date as, for example, "sábado, 12 de junho de 2027" (PT) or "Saturday, 12 June 2027" (EN), with `formatDay`.
- [ ] The field works with a keyboard and a screen reader on a phone.
