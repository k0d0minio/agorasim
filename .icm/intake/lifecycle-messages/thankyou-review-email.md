# Stub: The thank-you — their Google review link finally gets used

- feature-slug: thankyou-review-email
- epic: lifecycle-messages
- priority: P1
- size: S
- depends-on: daily-dispatcher
- sequence: 5 of 6
- sources: info PDF §2.6 (full client copy: "…live in the present moment! Diogo and Rita" + review link `https://g.page/r/CWIk-M6uFZMdEBM/review` + Instagram agorasim.pt); copy lens (the link appears nowhere in the codebase — "their cheapest growth asset, sitting unused")

## Problem

The client wrote a post-tour thank-you that asks for a Google review and points at
their Instagram. It has never been sent — the review link exists nowhere in the code.

## Proposed change

A dispatcher job: bookings whose departure was yesterday (confirmed, not
cancelled/refunded) get the §2.6 thank-you in the guest's locale — their wording
lightly edited, the review link prominent as a button, the Instagram mention.
Link-first per the register (an on-site reviews widget is an open question — do not
build one here). Idempotent via the message log.

## Acceptance criteria (rough)

- [ ] Day-after send, once, skipping cancelled/refunded
- [ ] Review link + Instagram present; PT/EN; §2.6 voice
- [ ] Logged; CI green

## Prompt

In the agorasim repo (`web/`), build the post-tour thank-you job per
`.icm/intake/lifecycle-messages/thankyou-review-email.md`: register on the daily
dispatcher, select yesterday's departed bookings, compose from the client's own §2.6
text in `.icm/docs/agorasim-info.pdf` (or its redacted successor) with the Google
review link as the primary CTA, send + log idempotently. PT/EN in sync. PR on a
`claude/` branch; no local checks — CI is the source of truth.
