# Findings jam-476

The operator files these later. One entry for each finding.

## Comment on JAM-476 (posted 2026-11-23)

- where: JAM-476 in Linear
- what: posted with the BAXTER tool on 2026-11-23, on Jamie's word of 2026-11-23 ("The sessions have access to linear tools via the baxter tool interface"), relayed by the parent session. The text is below.
- proposed: done

> Spike result: `.icm/docs/sms-channel.md` (PR #265).
>
> - Provider: Twilio, pay as you go, sender `Agorasim`. Per segment (USD): PT 0.0501,
>   ES 0.0875, FR 0.0798, DE 0.112, UK 0.056, US 0.0083 + carrier fee, CA 0.0083 + carrier fee,
>   AU 0.0515. Runner-up: Infobip (about 16% cheaper, EU-only data).
> - By SMS: booking confirmation, day-before reminder, balance request T−14, balance
>   reminder T−7. The thank-you stays email only.
> - Cost: about €3 to €16 a month for 20 to 120 bookings. The client holds the account and
>   pays Twilio directly.
> - Sender rules: Portugal needs no registration. Spain needs the CNMC alias registration
>   (up to 4 weeks, transition ends 2026-12-31). Australia needs ACMA pre-registration. US and
>   Canada need a number: email only at the start.
> - A Portuguese SMS is 2 segments (ã, ç, õ force UCS-2). An English SMS is 1 segment.
> - Build: about 4.25 days in 5 tickets (setup act, phone capture in E.164, the SMS channel
>   in `message_log`, the four messages, the privacy text).
> - 7 questions for the client are on the page.

## The phone number is free text

- where: `web/src/lib/form-schemas.ts` (`optionalText`), `tour_requests.phone`
- what: no form checks or normalises the phone number, and no form asks for a country code.
  SMS needs E.164. The team also cannot tap a foreign number with confidence today.
- proposed: new ticket (SMS-2 on the page)

## Spain alias registration has a deadline

- where: `.icm/docs/sms-channel.md`, Sender ID rules
- what: an unregistered alphanumeric sender to a Spanish number is blocked after the
  transition ends on 2026-12-31. Registration takes up to 4 weeks. If SMS to Spain is wanted
  early in 2027, the client must start it in December.
- proposed: question for the ticket

## The five SMS build tickets: filed by BAXTER

- where: Linear, team JAM, project agorasim
- what: the session tried to create them on 2026-11-23. The permission check of the session
  refused the act. BAXTER filed the drafts below on Jamie's word ("Yes, file them here",
  2026-11-23), with the blocking links below. Common to all five: state Triage,
  priority Medium, a "related" link to JAM-476, and these two lines at the top:
  `* source: P #5 and P §5 ("over email and SMS"); spike JAM-476, page .icm/docs/sms-channel.md.`
  `* timing: SMS follows after go-live (Jamie, 2026-11-23). Do not start before the site is live.`
- proposed: done (JAM-537 to JAM-541)

Links between them: SMS-2 blocks SMS-3. SMS-3 blocks SMS-4 and SMS-5. SMS-1 blocks SMS-4.

### SMS-1 · agorasim · SMS: the client opens the SMS provider account

- filed: JAM-537
- lane: chore · estimate 1 · labels: Chore, Client work, Waiting on a client
- Problem: the app cannot send an SMS without a provider account. Each account belongs to
  Agorasim (Commission & Payments Agreement §2). Spain needs the CNMC alias registration (up to
  4 weeks, the transition ends 2026-12-31). Australia needs ACMA pre-registration (about 5
  business days).
- Proposed changes: one setup page in `.icm/setup/`. The client opens the Twilio account in the
  company's name with the company card, sets the sender `Agorasim`, starts the Spain and
  Australia registrations and makes one restricted API key. Jamie puts the key into Vercel.
- Acceptance criteria:
  - [ ] `.icm/setup/` has a page for the SMS provider with one box for each act and who does it.
  - [ ] The page names the environment variables and keeps no value.
  - [ ] The page says how long the Spain and Australia registrations take, and that a US or
    Canadian number gets no SMS at the start.
- Outcome: the client holds the SMS account, and the build has a key to test with.

### SMS-2 · agorasim · SMS: every form keeps the phone number in international form

- filed: JAM-538
- lane: new · estimate 3 · labels: Feature, Client work
- Problem: every form keeps the phone as optional free text (`optionalText` in
  `web/src/lib/form-schemas.ts`, `tour_requests.phone`). No form asks for a country code or
  checks the number. An SMS needs E.164.
- Proposed changes: a country code choice and E.164 normalisation on the booking form, the
  quote form, the tour enquiry form, the manual booking and the lead edit. The label says what
  the number is for (pt and en). The phone stays optional unless the client says otherwise.
  The existing numbers are parsed best effort, with Portugal as default.
- Acceptance criteria:
  - [ ] On `/pt/reservar` and `/en/reservar` a guest picks a country code and types a number.
    The lead keeps it in E.164.
  - [ ] A number that cannot be valid is refused with a clear message, and the form keeps what
    the guest typed.
  - [ ] The other four forms act the same.
  - [ ] A lead with no number still books, and gets email only.
- Outcome: each new lead has a phone number that an SMS can reach, or no number.

### SMS-3 · agorasim · SMS: the message log sends an SMS beside an email

- filed: JAM-539
- lane: new · estimate 3 · labels: Feature, Client work, migration
- Problem: `web/src/lib/message-log.ts` is email only. Seven partial unique indexes key each
  claim on `(kind, recipient, …)`. An email and an SMS for one occasion would collide.
- Proposed changes: a `channel` column (`email` | `sms`, default `email`) in all seven indexes,
  in one forward-compatible migration. `lib/sms.ts` (Twilio) and `sendLoggedSms` with the same
  claim-then-send order. A GSM-7/UCS-2 segment counter with tests. The channel on the
  Notifications page. The retention job clears the Twilio id. No SMS to a US or Canadian number.
- Acceptance criteria:
  - [ ] An email and an SMS for one occasion are two rows, and a second run sends neither again.
  - [ ] The Notifications page shows the channel and the status of each SMS.
  - [ ] With no SMS key set, the app sends email as today and logs no SMS.
  - [ ] An anonymised enquiry keeps no Twilio message id.
- Outcome: the app can send one logged, idempotent SMS beside an email.

### SMS-4 · agorasim · SMS: the confirmation, the reminder and the balance messages go by SMS

- filed: JAM-540
- lane: new · estimate 3 · labels: Feature, Client work
- Problem: proposal §5 promises confirmations, reminders and the balance request over email and
  SMS. Today they go by email only. The thank-you stays email only (marketing, soft opt-in).
- Proposed changes: an SMS beside `booking-confirmation`, `day-before-reminder` (with the
  meeting point of the experience), `balance-request` (T−14) and `balance-reminder` (T−7), in
  pt and en, from the client's words (info request §2.6). Each SMS names the team's phone. No
  SMS carries a token link.
- Acceptance criteria:
  - [ ] A booking with a phone gets the confirmation SMS and the reminder SMS with the right
    meeting point, in its locale.
  - [ ] A wedding or event quote with a phone gets the balance SMS at T−14 and T−7.
  - [ ] No SMS has a token link. A pt SMS is at most 2 segments, an en SMS 1 segment.
  - [ ] The thank-you, the cancellation and the team copies send no SMS.
- Outcome: the guest gets the four promised messages by SMS as well as by email.

### SMS-5 · agorasim · SMS: the privacy policy names the SMS provider

- filed: JAM-541
- lane: tweak · estimate 1 · labels: Text / content, Client work
- Problem: `web/src/content/privacy.ts` and `.icm/docs/data-protection.md` name no SMS
  provider and do not say what the phone is used for.
- Proposed changes: Twilio as a processor (data, region, transfer safeguard) in both locales
  and in the register. The phone is used for SMS about the booking (Art. 6(1)(b)). Counsel
  confirms the wording.
- Acceptance criteria:
  - [ ] `/pt/privacidade` and `/en/privacy` name Twilio and the purpose of the phone number.
  - [ ] `.icm/docs/data-protection.md` has a Twilio row.
  - [ ] The pt and en texts say the same.
- Outcome: the policy is true on the day the first SMS goes out.
