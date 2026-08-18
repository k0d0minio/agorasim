# AGORA-010 · Booking lifecycle emails: day-before reminder, post-tour thank-you

| | |
|---|---|
| Status | ready |
| Type | feature |
| Priority | P1 |
| Size | M |
| Depends on | AGORA-002 (booking engine), launch (real bookings to email) |
| Sources | .icm/docs/agorasim-info.pdf §2.6 (local only, gitignored) |

## Problem

Diogo & Rita asked for three automatic messages (info PDF §2.6). The booking
confirmation already carries their welcome content — meeting point with maps pin,
departure, party. Missing are the two *scheduled* sends:

1. **Day-before reminder** — "Olá, tomorrow is the big day", repeating the meeting
   point pin (Countryside: Av. Mário Firmino Miguel, Sintra ·
   https://maps.app.goo.gl/zufzHo8QpmspvzqC9 · Medieval: Alameda Cardeal Cerejeira,
   Lisboa · https://maps.app.goo.gl/ucMojM5V7eGhcvn4A).
2. **Post-tour thank-you** — their drafted text ("…live in the present moment!"),
   with the Google review link https://g.page/r/CWIk-M6uFZMdEBM/review (they also
   suggested a review widget on the site — consider separately).

Both need a scheduled trigger (extend the existing daily/weekly cron on Vercel) and
must send in the guest's locale, once, idempotently.

## Acceptance

- [ ] Reminder email the day before, per confirmed booking, guest locale, once.
- [ ] Thank-you email the morning after, with the review link, once.
- [ ] Copy in `content/emails.ts` from their §2.6 drafts, PT/EN, on-brand layout.
- [ ] Cron-safe idempotency (a rerun never double-sends).
- [ ] CI green.

## Prompt

Add the day-before reminder and post-tour thank-you emails to the agorasim booking
engine. Read .icm/intake/AGORA-010-booking-lifecycle-emails.md for the exact copy
sources and constraints; reuse lib/booking-emails.ts + lib/email-layout.ts patterns
and the existing cron route. Open a PR on a claude/ branch; no local checks — CI is
the source of truth.
