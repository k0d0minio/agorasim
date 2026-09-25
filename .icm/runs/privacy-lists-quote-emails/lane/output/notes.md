# Tweak: privacy-lists-quote-emails

- change: web/src/content/privacy.ts: the Resend paragraph and the contract-performance
  paragraph (both locales) named only the tour emails (confirmation, day-before reminder,
  cancellation) → both now also name the wedding/event quote emails (quote sent, balance
  request + reminder, deposit-received/balance-paid receipts, refund notice), matching
  `.icm/docs/data-protection.md`'s Resend register row. `lastUpdated` bumped to
  2026-09-25 (both locales); terms.ts's own date is untouched since its text didn't change.
- changelog: announce: none (repo has no changelog page — `_shared/project-rules.md` →
  Announcing)
- learned: none
