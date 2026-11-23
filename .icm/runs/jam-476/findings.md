# Findings jam-476

The operator files these later. One entry for each finding.

## Draft comment for JAM-476 (the operator posts it)

- where: JAM-476 in Linear
- what: this repo does not write to Linear (`CLAUDE.md`). The summary for the ticket is below.
- proposed: question for the ticket

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
