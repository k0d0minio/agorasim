# Stub: Acknowledge the enquiry — and give the confirmation the client's voice

- feature-slug: enquiry-ack-email
- epic: lifecycle-messages
- priority: P1
- size: S
- depends-on: message-log-schema
- sequence: 3 of 6
- sources: 2026-08-29 map: `reservar/actions.ts` enquiry path sends no email to anyone (guest or team); info PDF §2.6 welcome copy ("Olá, welcome to the countryside area where we grow up… It will be a pleasure to meet you", signed "Diogo and Rita"); copy lens: shipped confirmation opens transactionally and signs "Agorasim"

## Problem

A guest who submits the enquiry form hears nothing, and the team isn't notified
either — the lead just appears on a board nobody is told to check. Meanwhile the paid
confirmation email ignores the client's own warmer §2.6 wording.

## Proposed change

Enquiry submission sends (a) the guest an acknowledgement in their locale using the
§2.6 welcome voice (what happens next, both phones/WhatsApp), and (b) the team the
existing-style notification with the Sales deep link. Rework the confirmation email's
opening and sign-off to the client's §2.6 voice ("Diogo and Rita", the countryside
line), keeping the meeting-point block, per-tour differences (Óbidos: Lisbon meeting
point, not in the classics), and the 48h/cancel-link content intact. Both send paths
log to the message log.

## Acceptance criteria (rough)

- [ ] Enquiry → guest ack (PT or EN) + team notification, both logged
- [ ] Confirmation email voice matches §2.6; PT/EN in sync
- [ ] CI green

## Prompt

In the agorasim repo (`web/`), per
`.icm/intake/lifecycle-messages/enquiry-ack-email.md`: add guest-ack + team emails to
the enquiry path in `web/src/app/[locale]/reservar/actions.ts` (build messages in
`web/src/lib/booking-emails.ts` style from `web/src/content/emails.ts`, render via
`web/src/lib/email-layout.ts`), and rewrite the confirmation email's opening/sign-off
to the client's own words in `.icm/docs/agorasim-info.pdf` §2.6 (redacted copy if the
original was untracked). Log all sends via the message-log wrapper (same epic). Keep
PT/EN in sync. PR on a `claude/` branch; no local checks — CI is the source of truth.
