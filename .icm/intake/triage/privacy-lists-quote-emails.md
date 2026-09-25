# Stub: The privacy policy names none of the wedding and event emails

- lane: tweak
- found-by: balance-scheduler / Release docs sync · 2026-09-25
- complexity: low

## Problem

The Resend paragraph and the contract-performance paragraph in `web/src/content/privacy.ts` list the tour emails (confirmation, the day-before reminder, cancellation, the thank-you, the enquiry reply). They name none of the emails a wedding or event couple receives: quote sent, deposit-received and balance-paid receipts, the refund notice, and since `balance-scheduler` the balance request at T−14 and the reminder at T−7. `.icm/docs/data-protection.md` lists them all, so the page and the policy disagree.

## Proposed change

Add the quote emails to both paragraphs in PT and EN (contract performance, Art. 6(1)(b)), in the policy's own register. Keep `TERMS`/privacy "last updated" in step if the policy carries a date.
