# Stub: The thank-you — their Google review link finally gets used

- feature-slug: thankyou-review-email
- scope: lifecycle-messages
- personas: guest
- initiative: contracted feature ⑤ complete after launch / objective: the post-tour thank-you with the review link goes out by itself
- priority: P1
- size: S
- depends-on: day-before-reminder
- sequence: 3 of 4
- sources: the client's copy, info PDF §2.6 (thank-you with `https://g.page/r/CWIk-M6uFZMdEBM/review` and the Instagram line); D24 (soft opt-in, every guest, opt-out line); product lens — no reviews entry in `web/src/content/site.ts:21-23`, the URL exists only in the PDF; legal lens — `web/src/content/emails.ts:96,135` ("Transactional, so no unsubscribe"), `privacy.ts:106,123` / `:175,192` list transactional mail as confirmation/cancellation/enquiry-reply only; `.icm/docs/data-protection.md` rule: the policy changes in the same PR as the send

## Problem

The client's most-wanted message after the confirmation is the one that brings the next
guest — the review ask — and it has nowhere to render its link and no basis stated. The
policy today says every email is transactional with no unsubscribe, which a review
solicitation is not.

## Proposed change

Put the Google review URL in `site.ts` beside the social links; a thank-you template in
PT and EN in the client's §2.6 words, sent the morning after the tour by the dispatcher
for every confirmed booking that took place (same query as the reminder, day D−1), with a
one-line opt-out (a signed link that records the opt-out on the booking's guest, or the
marketing-consent field set to withdrawn — Define chooses); the privacy policy's email
list gains the thank-you under the soft opt-in basis in both locales, and
`data-protection.md`'s processor/purpose table is updated in the same PR.

## Acceptance criteria (rough)

- [ ] One thank-you per completed booking the morning after, in the guest's locale, with the review link and an opt-out line; cancelled and no-show-marked bookings get none
- [ ] Opting out stops any later marketing-basis send to that address; the once-only rule holds
- [ ] Privacy policy (PT + EN) and `data-protection.md` updated in the same PR; CI green

## Out of scope (this feature)

- An on-site reviews widget; Instagram follow tracking; any SMS.
- Re-sends or a second nudge.

## Notes for Define

- D24: soft opt-in (existing customer, own similar service, one send, opt-out) — the
  spec's Problem cites it; `[LAWYER]` only if the operator wants certainty.
- Open for Define: what "took place" means when a booking was moved the same morning —
  send on the new date only (stub 1 makes that readable from the log).

## Prompt

In the agorasim repo (`web/`), read `.icm/intake/lifecycle-messages/thankyou-review-email.md`
and the breakdown. Add the review URL to `src/content/site.ts`, the PT/EN thank-you template
in `src/lib/booking-emails.ts`, the morning-after job on the dispatcher with an opt-out
mechanism, and update `src/content/privacy.ts` (both locales) and
`.icm/docs/data-protection.md` in the same PR. Tests for the send window, the opt-out and
the once-only rule. PR on a `claude/` branch; no local checks — CI is the source of truth.
