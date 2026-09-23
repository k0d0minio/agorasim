# agorasim — where things stand

_2026-09-23_ · 3 delivered · 0 ready on UAT · 7 in progress · 15 queued

## Delivered to production

- **Pt greeting gender neutral** — the §2.6 welcome line in the booking confirmation and the enquiry acknowledgement — PT feminine "Bem-vinda … Será um prazer conhecê-la." → ungendered "Boas-vindas … S… _(on 2026-09-18)_
- **Range actions reachable** — the range card rendered below the fold at 375×667 with the stripe as its only feedback → it is pinned above the bottom toolbar while a stripe is picked (sticky, in flow, md:s… _(on 2026-09-18)_
- **Terms link in confirmation email** — web/src/content/emails.ts + web/src/lib/booking-emails.ts: the guest confirmation carried the cancellation rule and the cancel link but never the terms → it now carries the on… _(on 2026-09-18)_

## Ready for you to try on UAT

Open **https://uat.agorasim.jamienisbet.com** — everything below is live there, together, on one address that does not change.

_Nothing is waiting on UAT right now._

## Currently being worked on

- **"Registar reserva" from the Sales board — a phone enquiry becomes a booking without the calendar detour** — in progress _(part of: Go-live — agorasim.pt takes real bookings, on their domain, with the fee on)_
- **Open the two doors — casamentos and eventos enquiries reach the Sales board** — in progress _(part of: Go-live — agorasim.pt takes real bookings, on their domain, with the fee on)_
- **A weather move no longer silences the reminder, and every send is in the log** — in progress _(part of: Lifecycle messages — the client's two remaining emails, and a Notifications page that tells the truth)_
- **The quote's data is complete before any money moves — kinds, erasure, stages, the transfer case** — in progress _(part of: Quote flow — the weddings and events money, on the schema that already exists)_
- **Focus is invisible on the public custom controls** — being fixed
- **The manual-booking party steppers overflow a 375px sheet** — being fixed
- **After the second tap the calendar's range actions are below the fold** — being adjusted

## Queued next

**Go-live — agorasim.pt takes real bookings, on their domain, with the fee on**
1. agorasim.pt leaves Amen — registrant their company, zone mirrored, Workspace untouched _(priority)_
2. Connect goes live — platform profile, Diogo & Rita's account, one webhook, three env values _(priority)_ _(waiting on: human — Stripe controls the clock on Diogo & Rita's Standard-account verification (ID + IBAN). Platform account **live-activated** (Jamie, 2026-09-11); Connect platform profile and their account still to do tonight)_
3. Confirmation emails leave from agorasim.pt, not Jamie's domain _(priority)_
4. Refuse to start checkout when the Stripe key's mode contradicts the deployment
5. The words a guest reads on launch day are true — no engineer notes, no "being built", no "being recovered"
6. The launch plan's Stripe-unset fallback finally has a test
7. The switch — nameservers move, Production goes live, first real euro _(priority)_ _(waiting on: human — waits for the registrar transfer to land (DNS.pt / the Portuguese registrar control the clock) and for Diogo & Rita's Stripe account to verify)_

**Lifecycle messages — the client's two remaining emails, and a Notifications page that tells the truth**
1. The day-before reminder — "Tomorrow is the big day", with the pin
2. The thank-you — their Google review link finally gets used
3. "Mensagens automáticas" tells the truth — the real log, in Portuguese, no fake switches

**Quote flow — the weddings and events money, on the schema that already exists**
1. The quote builder — Rita turns an enquiry into a priced event and sends it
2. The couple's quote page — the terms in front of them, the deposit paid on tap, the 6% on the instalment
3. Refunding a deposit or balance reaches the books, and the fee comes back pro-rata
4. A deposit-paid event takes its drivers and cars out of the pool _(waiting on: client — what a deposit-paid wedding or event takes out of the pool (the whole day, one departure, N specific cars) is unanswered (register open question))_
5. The T−14 balance — issued by itself, chased once, and the unpaid rule written down

_Plus 15 smaller fix(es) and adjustment(s) parked, picked up in the flow._

---

_Compiled by the project's own pipeline on 2026-09-23 from its records (origin/main; the UAT batch from the working tree; stages from the open pull requests). Titles are the work items' own names — ask for detail on any line._
