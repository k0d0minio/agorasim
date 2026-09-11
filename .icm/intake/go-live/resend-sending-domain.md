# Stub: Confirmation emails leave from agorasim.pt, not Jamie's domain

- feature-slug: resend-sending-domain
- epic: go-live
- priority: P0
- size: S
- depends-on: none
- sequence: 3 of 6
- sources: Resend account 2026-09-10 — one domain, `mail.jamienisbet.com`, status **partially_failed**, no `agorasim.pt`; `web/src/lib/email.ts` (`BOOKING_EMAIL_FROM` at `:72`, `BOOKING_NOTIFICATION_EMAILS`); Q17/Q18 (2026-09-10): from `reservas@agorasim.pt`, reply-to `info@`, team copy to `info@`; live DNS: apex SPF/MX/DKIM/DMARC are Google's, `_dmarc` `p=none`

## Problem

Every guest confirmation and team copy goes out from a domain that is not the client's
and is not fully verified. On the live domain the guest reads "Agorasim" and sees a
jamienisbet.com sender; replies go nowhere useful.

## Proposed change

**DNS (Jamie, tonight, inside the zone mirror):** add `agorasim.pt` in Resend
(eu-west-1) and put the records it prints into the **new registrar's zone** as part of
`domain-transfer-tonight`'s mirror — DKIM TXT on `resend._domainkey.agorasim.pt`, one MX
and one SPF TXT on `send.agorasim.pt`. Nothing on the apex changes, so Google mail is
untouched. **App (this stub, session work today):** `BOOKING_EMAIL_FROM` documented as
`Agorasim <reservas@agorasim.pt>` in `web/.env.example`; every outgoing message carries
`reply-to: info@agorasim.pt` (from env, default to the site contact); the email
layout's sender copy and the runbook's verification step name the live sender. Diogo
creates `reservas@` as an alias on info@ in admin.google.com so replies land.

## Acceptance criteria (rough)

- [ ] Every send from `web/src/lib/email.ts` sets reply-to `info@agorasim.pt` (env-driven, tested)
- [ ] `.env.example` documents `BOOKING_EMAIL_FROM` / `BOOKING_NOTIFICATION_EMAILS` live values
- [ ] After the env flip: one booking email `delivered` in Resend, read in the info@ inbox, not spam; CI green

## Prompt

In the agorasim repo (`web/`), read `.icm/intake/go-live/resend-sending-domain.md`.
Do the app half only: make every message sent through `web/src/lib/email.ts` carry a
`reply-to` of `info@agorasim.pt` (read from an env value with that default), document
the live `BOOKING_EMAIL_FROM` and `BOOKING_NOTIFICATION_EMAILS` values in
`web/.env.example`, and cover the reply-to in the existing email tests. Do not touch
Resend or DNS — that half is Jamie's in `.icm/docs/launch-runbook.md` § Track D. PR on
a `claude/` branch; no local checks — CI is the source of truth. Leave the stub open;
it moves to `_done/` when Jamie confirms the delivered-in-inbox check.
