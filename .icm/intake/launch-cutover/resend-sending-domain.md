# Stub: Confirmation emails leave from agorasim.pt, not Jamie's domain

- feature-slug: resend-sending-domain
- epic: launch-cutover
- priority: P0
- size: S
- depends-on: none
- sequence: 9 of 14
- sources: Resend account on 2026-09-10 — one domain, `mail.jamienisbet.com`, status **partially_failed**, no `agorasim.pt`; `web/src/lib/email.ts:50` (`BOOKING_EMAIL_FROM`), `:61` (`BOOKING_NOTIFICATION_EMAILS`); live DNS: apex SPF/MX/DKIM/DMARC all Google's, `_dmarc` `p=none`; runbook §2 Track D

## Problem

Every guest confirmation and team copy goes out from a domain that is not the
client's and is not even fully verified. On a live domain the guest reads "Agorasim"
and sees a jamienisbet.com sender; replies go nowhere useful; deliverability rides a
half-verified domain.

## Proposed change

Two halves. **DNS (Jamie, runbook Track D):** add `agorasim.pt` in Resend (eu-west-1)
and place its records at Amen — DKIM on `resend._domainkey.agorasim.pt`, MX + SPF on
the return-path subdomain `send.agorasim.pt`. Nothing on the apex changes, so Google
Workspace mail is untouched. **App (this stub):** `BOOKING_EMAIL_FROM` documented as
`Agorasim <reservas@agorasim.pt>` in `.env.example`; every outgoing message carries
`reply-to: info@agorasim.pt` (guests answer the humans, not a no-reply); the email
layout's "from" copy and the runbook's verification step reference the live sender.
Verify: one sandbox booking after the env flip, message `delivered` in Resend, lands
in the info@ Workspace inbox, not in spam.

## Acceptance criteria (rough)

- [ ] Guest + team emails sent from `reservas@agorasim.pt` with reply-to `info@agorasim.pt`
- [ ] `.env.example` documents the live sender; runbook Track D steps match Resend's record set
- [ ] One delivered test read in the Workspace inbox (Jamie's tick)
- [ ] CI green

## Prompt

In the agorasim repo (`web/`), read `.icm/intake/launch-cutover/resend-sending-domain.md`
and `.icm/docs/launch-runbook.md` § Track D. Add a reply-to of `site.email` to every
message `web/src/lib/email.ts` sends (guest and team), document
`BOOKING_EMAIL_FROM=Agorasim <reservas@agorasim.pt>` in `web/.env.example`, and check
`email-layout.ts` copy for any hardcoded sender text. DNS and Resend dashboard steps are
Jamie's — do not attempt them. PR on a `claude/` branch; no local checks — CI is the
source of truth.
