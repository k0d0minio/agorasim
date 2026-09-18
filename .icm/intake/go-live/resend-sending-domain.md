# Stub: Confirmation emails leave from agorasim.pt, not Jamie's domain

- feature-slug: resend-sending-domain
- epic: go-live
- priority: P0
- size: S
- depends-on: none
- sequence: 3 of 9
- sources: **app half shipped in #88** (`web/src/lib/email.ts` — every send carries `reply_to: message.replyTo || site.email`; `.env.example` documents the live sender values); Resend account 2026-09-10 — one domain, `mail.jamienisbet.com`, status **partially_failed**, no `agorasim.pt`; `web/src/lib/email.ts` (`BOOKING_EMAIL_FROM` at `:72`, `BOOKING_NOTIFICATION_EMAILS`); Q17/Q18 (2026-09-10): from `reservas@agorasim.pt`, reply-to `info@`, team copy to `info@`; live DNS: apex SPF/MX/DKIM/DMARC are Google's, `_dmarc` `p=none`

## Problem

Every guest confirmation and team copy goes out from a domain that is not the client's
and is not fully verified. On the live domain the guest reads "Agorasim" and sees a
jamienisbet.com sender; replies go nowhere useful.

## Proposed change

**DNS (Jamie, tonight, inside the zone mirror):** add `agorasim.pt` in Resend
(eu-west-1) and put the records it prints into the **new registrar's zone** as part of
`domain-transfer-tonight`'s mirror — DKIM TXT on `resend._domainkey.agorasim.pt`, one MX
and one SPF TXT on `send.agorasim.pt`. Nothing on the apex changes, so Google mail is
untouched. **App — done (#88, 2026-09-10):** every outgoing message answers to `info@agorasim.pt` by
default (`web/src/lib/email.ts`), and `web/.env.example` documents the live
`BOOKING_EMAIL_FROM` / `BOOKING_NOTIFICATION_EMAILS` values. What remains is Jamie's Track D:
the Resend domain, its zone rows, the `reservas@` alias on info@ (Diogo, admin.google.com),
the Production env flip and the delivered-in-inbox check.

## Acceptance criteria (rough)

- [x] Every send from `web/src/lib/email.ts` sets reply-to `info@agorasim.pt` (env-driven, tested) — #88
- [x] `.env.example` documents `BOOKING_EMAIL_FROM` / `BOOKING_NOTIFICATION_EMAILS` live values — #88
- [ ] After the env flip: one booking email `delivered` in Resend, read in the info@ inbox, not spam; CI green

## Prompt

In the agorasim repo, read `.icm/intake/go-live/resend-sending-domain.md`. The app half
shipped in #88 — there is no code to write. Your work: when Jamie reports the env flip and
the Resend domain Verified, read back one delivered booking email's headers (sender
`reservas@agorasim.pt`, reply-to `info@agorasim.pt`, links resolving to agorasim.pt) and
report. Never touch Resend, DNS or Vercel env. When Jamie confirms the delivered-in-inbox
check, `git mv` this stub to `.icm/intake/go-live/_done/` in a PR on a `claude/` branch.
