# SMS channel — the provider, the cost and the messages

- status: **spike result, 2026-11-23** (JAM-476, time box 1 day). This page is a
  recommendation. Nothing on it is decided until Jamie and the client say yes. The questions
  for the client are in [Open questions](#open-questions-for-the-client).
- today: the app sends **no SMS**. There is no SMS code and no SMS provider. Every automatic
  message goes by email through Resend (`web/src/lib/email.ts`, `web/src/lib/message-log.ts`).
- why it is open: the proposal of 2026-07-23 promises "Email & SMS notifications" (item 5)
  and says that "confirmations, reminders and the balance request go out automatically over
  email & SMS" (§5). The decision of 2026-08-29 put SMS after launch
  (`.icm/intake/README.md` § Decisions).
- prices: read on the providers' public pages on 2026-11-23, in USD unless the row says EUR.
  The conversion used is 1 USD = 0.856 EUR. Prices change: read them again before the build.

## Recommendation

1. **Provider: Twilio**, pay as you go, sender name `Agorasim`.
2. **By SMS: four of the five automatic messages.** The booking confirmation, the
   day-before reminder, the balance request (T−14) and the balance reminder (T−7). The
   post-tour thank-you stays email only.
3. **Countries at the start:** Portugal, the EU, the UK and Australia, with the alphanumeric
   sender. The US and Canada get email only until a later ticket adds a toll-free number
   (see [US and Canada](#us-and-canada)).
4. **Cost:** about **€3 to €16 a month** for 20 to 120 bookings a month. The client pays
   Twilio directly.
5. **Account holder: the client.** Agorasim opens the Twilio account in the company's name,
   with its own card, as the agreement says for every account (Commission & Payments
   Agreement §2: "Your accounts, your data"). Jamie gets one restricted API key, kept in
   Vercel.
6. **Build size: about 4 days** in five tickets
   (see [Build plan](#build-plan-proposed-tickets)).

Why Twilio, when it is not the cheapest: at this volume the four providers differ by €5 a
month at most. The choice then turns on the cost of setup and support:

- Twilio is pay as you go, with no plan, no minimum top-up and no sales call. The client can
  open the account alone.
- Twilio does the sender pre-registration for Spain and Australia from its console, and it
  does US toll-free verification when that ticket comes.
- Twilio has a data region in Ireland (IE1) for messaging, a DPA and a mature Node SDK.
- Runner-up: **Infobip**, about 16% cheaper per message, with data kept in the EU (Sweden and
  Frankfurt). Choose it if the client asks for EU-only data. Its self-service account is
  prepaid (possibly a €5 minimum, not verified).

## The providers compared

### Price per SMS segment, USD

Alphanumeric sender for Europe and Australia. A long code number for the US and Canada, plus
the carriers' fee there.

| Destination | Twilio | Vonage | Infobip | Bird |
|---|---|---|---|---|
| Portugal | 0.0501 | 0.0541 | 0.042 | 0.040 |
| Spain | 0.0875 | 0.0983 | 0.071 | 0.065 |
| France | 0.0798 | 0.0897 | 0.0969 | 0.065 |
| Germany | 0.112 | 0.1205 | 0.088 | 0.080 |
| United Kingdom | 0.056 | 0.0566 | 0.044 | 0.050 |
| Netherlands | 0.1143 | 0.1303 | 0.093 | 0.085 |
| United States | 0.0083 + carrier fee 0.0035–0.005 | 0.0086 + 0.0035–0.005 | 0.0075–0.0082 (carrier fee not stated) | 0.0035 + 0.0035–0.005 |
| Canada | 0.0083 + carrier fee 0.0064–0.0087 | 0.0086 (carrier fee not seen) | 0.0093 | 0.0035 + 0.0066–0.0153 |
| Australia | 0.0515 | 0.0581 | 0.0268 | 0.0325 |

Sources: `twilio.com/en-us/sms/pricing/<cc>`, the price JSON behind
`vonage.com/communications-apis/sms/pricing/`, `infobip.com/pricing/sms.csv` (Infobip's
average price), `bird.com/pricing/sms/<cc>`. Twilio charges $0.001 for a failed message.

### Fixed costs

| | Twilio | Vonage | Infobip | Bird |
|---|---|---|---|---|
| Plan or minimum | none | not verified | prepaid; €5 minimum seen once, not verified | none for pay as you go |
| Alphanumeric sender | free | free | free | free |
| US toll-free number | $2.15/month | $2.12/month | not verified | not verified |
| US long code (10DLC) | $1.15/month | $1.09/month | not verified | not verified |
| EU data region | IE1 (Ireland); Twilio does not promise that all data stays there | `api-eu.vonage.com` | EU-locked (Sweden, Frankfurt) | `eu1` |

### Sender ID rules for the guests' countries

| Country | Sender `Agorasim` | Registration |
|---|---|---|
| Portugal | yes | None found at ANACOM or at MEO, NOS or Vodafone. No fee, no lead time. ANACOM proposed a law change against sender spoofing in July 2025. Its result is not confirmed. |
| Spain | yes | **Required.** Every alphanumeric sender to a Spanish number must be in the CNMC "Registro de Alias" (Orden TDF/558/2026). Operators block an unregistered alias after the transition, which ends 2026-12-31. The alias holder or a representative with a Spanish digital certificate registers it. Twilio's pre-registration takes up to 4 weeks. |
| France | yes | Not required at Twilio. No special characters. The 08:00–21:30 window is for marketing only. |
| Germany, Netherlands | yes | None. |
| United Kingdom | yes | Only for a protected name (Twilio). Bird asks for it, 5 business days. |
| Australia | yes | ACMA's SMS Sender ID Register is live since June 2026. Since 2026-07-01 an unregistered name shows as "Unverified". Twilio asks for pre-registration with proof of the right to the name, about 5 business days. |
| United States, Canada | **no** | A number is necessary. See [US and Canada](#us-and-canada). |

A guest cannot reply to an alphanumeric sender. Thus each SMS names the team's phone number.

### US and Canada

- An alphanumeric sender does not work. The sender must be a number.
- **US 10DLC** (a local number): brand registration $4.50 once, brand vetting $41.50 once,
  campaign vetting $15 for each submission, then $1.50 to $10 a month. A Portuguese company
  can register as a Standard brand with its NIF. Approval takes up to 5 business days.
- **US toll-free number** (recommended for this volume): $2.15 a month at Twilio, with a
  verification and no fee found. Since 2026-09-15 Twilio refuses a submission without separate
  URLs for the privacy policy and the terms. The privacy policy still carries its draft banner
  (`data-protection.md`, Open items). Thus the verification waits for the final policy.
- **Canada:** a long code needs no registration. A toll-free number needs the same
  verification as in the US.
- At the start, a guest with a US or Canadian number gets email only. The app sends no SMS to
  a number that it cannot reach with a registered sender.

### Characters and segments

- One SMS segment holds 160 GSM-7 characters or 70 UCS-2 characters. A longer message
  splits into segments of 153 or 67 characters, and each segment is charged.
- GSM-7 has `é`, `É`, `à` and `Ç`. The letters `ã`, `õ`, `ç`, `á`, `í`, `ó`, `ú`, `â`,
  `ê`, `ô`, `À`, `Ã` and `Õ` force UCS-2. Almost every Portuguese sentence has one of them.
- Thus a Portuguese SMS is **2 segments** (up to 134 characters) and an English SMS is
  **1 segment** (up to 160 characters). The pt-PT text keeps its accents: the site's
  client-facing text is correct pt-PT, so the cost is 2 segments.
- `€` counts as 2 GSM-7 characters. The drafts below do not use it.

## The messages

### The five automatic messages

| Message | Today (email) | By SMS | Why |
|---|---|---|---|
| Booking confirmation (tour) | `booking-confirmation`, at the payment or the manual booking | **yes** | Proposal §5. The guest knows at once that the number works and the booking is real. |
| Day-before reminder (tour) | `day-before-reminder`, daily job 06:00 UTC (`web/src/lib/cron/day-before-reminder.ts`) | **yes** | The message that prevents a no-show. It carries the meeting point, as the client asked (info request §2.6). |
| Balance request, T−14 (wedding, event) | `balance-request` (`web/src/lib/cron/balance-scheduler.ts`) | **yes** | Proposal §5 names it. The SMS tells the couple that the payment link is in their email. |
| Balance reminder, T−7 (wedding, event) | `balance-reminder` | **yes** | The same occasion, a week later. |
| Post-tour thank-you with the review link | `thank-you-review` (`web/src/lib/cron/thank-you-review.ts`) | **no** | It is marketing, under the soft opt-in (decision 2026-09-18). An SMS opt-out needs a STOP keyword that an alphanumeric sender cannot receive. The review link works better in an email. |

One more message is a strong case for SMS, but it is not in the five: **the weather move**
(`booking-moved`). The team decides it the afternoon before, when a guest may not read
email. This is question 2 for the client.

Every other message stays email only: the cancellation, the enquiry reply, the quote, the
receipts, the refund notice, the payment link and every team copy.

### No link with a token in an SMS

The balance SMS says that the link is in the email. It does not carry the quote link:

- The quote link is a bearer token (`web/src/lib/quote-token.ts`, 32 bytes). An SMS is not
  encrypted, and a phone shows it on the lock screen.
- The link is about 75 characters, which alone is a full UCS-2 segment.

The reminder carries the client's public Google Maps link to the meeting point. It is not
personal.

### Drafts

These drafts show the length and the segment count. The client's own words (info request
§2.6) go into the final text in the build. Each count is from a GSM-7/UCS-2 counter.

| Message | pt (UCS-2) | en (GSM-7) |
|---|---|---|
| Confirmation | "Agorasim: reserva confirmada. Passeio Rural Saloia, 14 ago, 10h00, 2 pessoas. Os detalhes seguem por email. Dúvidas: +351926210707" — 130 chars, 2 segments | "Agorasim: booking confirmed. Countryside tour, 14 Aug, 10:00, 2 guests. Details are in your email. Questions: +351926210707" — 123 chars, 1 segment |
| Reminder | "Agorasim: o passeio é amanhã, 10h00. Ponto de encontro: https://maps.app.goo.gl/zufzHo8QpmspvzqC9 Até amanhã!" — 109 chars, 2 segments | "Agorasim: your tour is tomorrow at 10:00. Meeting point: https://maps.app.goo.gl/zufzHo8QpmspvzqC9 Questions: +351926210707. See you!" — 133 chars, 1 segment |
| Balance request | "Agorasim: o restante do seu evento de 12 set vence a 29 ago. Enviámos o link de pagamento por email. Dúvidas: +351926210707" — 123 chars, 2 segments | "Agorasim: the balance for your event on 12 Sep is due on 29 Aug. The payment link is in your email. Questions: +351926210707" — 124 chars, 1 segment |
| Balance reminder | "Agorasim: lembrete, o restante do seu evento de 12 set vence a 29 ago. O link de pagamento está no seu email." — 109 chars, 2 segments | "Agorasim: reminder, the balance for your event on 12 Sep is due on 29 Aug. The payment link is in your email." — 109 chars, 1 segment |

The phone number in the drafts is Diogo's, from `web/src/content/site.ts`. The medieval tour
has its own meeting point in Lisbon (info request §2.6), so the reminder takes the meeting
point from the experience.

## Consent and data protection

Nothing here is legal advice. Counsel confirms it with the other items of
[data-protection.md](data-protection.md).

- **The four SMS are contract performance** (Art. 6(1)(b)), like their emails. They need no
  consent and no opt-out line. This is the same basis that the decision of 2026-09-18 gives
  the day-before reminder.
- **The same marketing rule holds for SMS.** The ePrivacy Directive counts an SMS as
  "electronic mail" (Art. 2(h)). Lei n.º 41/2004 applies to it as to email. A thank-you by SMS
  would thus need the same soft opt-in and an opt-out. This is one more reason to keep it
  email only.
- **The phone number is optional today.** Each form labels it as optional and keeps it as
  free text (`tour_requests.phone`, `optionalText` in `web/src/lib/form-schemas.ts`). The form
  must say what the number is for ("for SMS about your booking"). The privacy policy must
  name Twilio as a processor, in both locales.
- **Twilio keeps the message body and the number.** The Twilio message id in
  `message_log.provider_message_id` points to them. The retention job must clear it as it
  does a Resend id (`web/src/lib/retention.ts`). Twilio's message redaction setting can also
  stop Twilio from keeping the body.

## The message log takes a second channel

Yes, with one migration. Today a send is claimed under seven partial unique indexes, each
keyed on `(kind, recipient, …)` (`web/src/db/schema.ts`, `message_log_*_key`). An email and an
SMS for the same occasion would collide on the same key.

- Add a column `channel` (`email` | `sms`), not null, default `email`, and add it to each of
  the seven indexes. Old code writes `email` by default, so the migration is
  forward-compatible.
- Add `sendLoggedSms` next to `sendLoggedEmail`, with the same claim-then-send order and the
  same "never throws" rule. An SMS that fails never stops the email.
- `provider_message_id`, `status` and the Notifications page work for both channels. The page
  shows the channel.
- The alternative, a second set of kinds (`day-before-reminder-sms`), avoids the index change
  but doubles the enum. It is not recommended.

## Monthly cost

Volume: the site is not live, so there is no booking history. The ceiling is 2 drivers × 2
departures (10:00, 14:00) × 30 days = 120 tours a month (info request §1.5). Each tour sends 2
SMS (confirmation, reminder). The model adds 4 weddings or events a month, each with 2 SMS
(balance request, balance reminder).

Destination mix (an assumption, question 1): Portugal 40%, Spain 8%, France 8%, Germany 7%,
UK 8%, Netherlands 4%, US 12%, Canada 3%, Australia 10%. A Portuguese number gets the pt text
(2 segments). Every other number gets the en text (1 segment).

| Bookings a month | SMS | Twilio | Infobip | Vonage | Bird |
|---|---|---|---|---|---|
| 20 (low season) | 48 | €3.18 | €2.68 | €3.47 | €2.47 |
| 50 | 108 | €7.17 | €6.02 | €7.80 | €5.55 |
| 100 (high season) | 208 | €13.80 | €11.60 | €15.02 | €10.69 |
| 120 (the ceiling) | 248 | €16.46 | €13.83 | €17.91 | €12.75 |

- The figures include the US and Canada at the number rate. With email only for them at the
  start, the cost is a little lower.
- With a US toll-free number later, add €1.84 a month (Twilio $2.15).
- The weather-move SMS, if the client wants it, adds one SMS for each moved booking.

### WhatsApp as the alternative

The client uses WhatsApp every day, and WhatsApp is much cheaper for a Portuguese guest:

- Meta's utility template price from 2026-10-01: Portugal $0.0171, Spain $0.02, UK $0.022,
  US and Canada $0.0034, Australia $0.0113, Germany $0.055, Netherlands $0.05. Twilio adds
  $0.005 for each message.
- From 2026-10-01 Meta also charges a utility message inside the 24-hour customer-service
  window.
- One pt reminder costs $0.022 by WhatsApp and $0.10 by SMS (2 segments).

But WhatsApp is not the word in the deal, and it needs more setup:

- Meta business verification.
- A number for the API.
- Each template approved by Meta.
- The guest's opt-in for WhatsApp messages.
- A fallback for a guest without WhatsApp.

Recommendation: build SMS, as the proposal says. Keep WhatsApp for a later spike when the
client asks for it (question 6). Twilio sends both through the same API, so the SMS build does
not block WhatsApp.

## Build plan (proposed tickets)

None of these tickets exist. BAXTER files them after Jamie and the client agree.

| # | Ticket | Size | Depends on |
|---|---|---|---|
| SMS-1 | **Setup act:** the client opens the Twilio account, adds the card, sets the sender `Agorasim` and starts the Spain and Australia registrations. Jamie puts the API key into Vercel. A page in `.icm/setup/`; a person ticks its boxes. | 0.25 d (Jamie) + the client's time + up to 4 weeks for Spain | the client's yes |
| SMS-2 | **Phone capture:** a country code and E.164 form for the phone on the booking form, the quote form, the tour enquiry form, the manual booking and the lead edit. The label says what the number is for (pt and en). The existing numbers are parsed best effort, with Portugal as default. | S · 1 d | — |
| SMS-3 | **The SMS channel:** `lib/sms.ts` (Twilio), `sendLoggedSms`, the `channel` column and the seven indexes in a migration, a GSM-7/UCS-2 segment counter with tests, the channel on the Notifications page, the retention of the Twilio id. | M · 1.5 d | SMS-2 |
| SMS-4 | **The four messages:** the pt and en texts from the client's words, sent beside the confirmation, the day-before reminder and the two balance emails. No SMS to a US or Canadian number. | M · 1 d | SMS-3 |
| SMS-5 | **Privacy text:** Twilio as a processor, the phone's purpose, in `privacy.ts` (both locales) and in `data-protection.md`. | S · 0.5 d | SMS-3 |

Core total: **about 4.25 days** of build, plus the setup wait.

Later, each on its own ticket and only if the client asks:

- SMS-6, the weather-move SMS: 0.25 d.
- SMS-7, US and Canada through a Twilio toll-free number and its verification: 0.5 d, after the
  final privacy policy.
- SMS-8, Twilio's delivery status webhook, which sets `delivered` or `failed`: 0.5 d.
- A WhatsApp spike.

## Open questions for the client

1. How many bookings do you expect in a high-season month and in a low-season month, and
   where do most guests come from? Default: the model above (20 to 120, 40% Portugal).
2. Do you want an SMS when you move a tour for the weather? Default: yes (SMS-6).
3. Must a guest give a phone number to book? Default: no. A guest without a number gets
   email only.
4. Will you open the Twilio account in the company's name, with the company card, and who
   registers the alias for Spain (it needs a Spanish digital certificate or a
   representative)? Default: yes, and Twilio's pre-registration with the company's papers.
5. Do guests with a US or Canadian number get an SMS? It costs about €2 a month and a
   verification that waits for the final privacy policy. Default: email only at the start.
6. Do you want WhatsApp in place of SMS, or beside it? Default: SMS now, WhatsApp later.
7. Which phone number goes in each SMS, Diogo's or Rita's? Default: Diogo's,
   +351 926 210 707.

## Still unknown when the time box ended

- Infobip and Vonage carrier fees for the US and Canada. The US number price at Infobip and
  Bird. Vonage's minimum top-up. Infobip's minimum top-up.
- Whether Twilio charges a fee for US toll-free verification. No fee was found.
- The ACMA register details, read from search summaries only (the page timed out).
- The result of ANACOM's 2025 law proposal on sender spoofing, and CEPT ECC/REC/(25)04. If
  Portugal follows Spain, the sender `Agorasim` will need registration in Portugal too.
- Whether the client's WhatsApp Business app number can also serve the WhatsApp API.
- The real volume and the real destination mix: there is no booking history.
