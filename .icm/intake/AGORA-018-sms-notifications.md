# AGORA-018 · SMS notifications: confirmations + day-before reminders

| | |
|---|---|
| Status | ready |
| Type | feature |
| Priority | P2 |
| Size | M |
| Depends on | AGORA-010 (the scheduled-send infrastructure this reuses) |
| Sources | AgorasimProposal feature #5 (email **& SMS** are paid scope) · Jamie's decision, 24 Aug 2026: post-launch, P2 — email covers the need first |

## Problem

Proposal feature #5 sells email **and SMS** notifications; zero SMS exists (no provider,
no code — the only "SMS" strings are in the admin design preview). Deliberately P2: email
ships first via AGORA-010, SMS follows honestly rather than blocking launch. It is still
paid scope and must not be quietly dropped.

## Acceptance

- [ ] Provider chosen and documented (default candidate: Twilio; check PT sender-ID
      rules and per-message cost — the cost sits against the commission margin).
- [ ] Booking confirmation + day-before reminder SMS mirroring the email copy, guest
      locale, once, idempotent alongside the AGORA-010 cron.
- [ ] Guest phone captured at checkout with SMS consent; privacy policy updated for the
      new processor before the first message is sent (GDPR).
- [ ] Failures logged and alerting — an SMS outage must be visible, not silent.
- [ ] CI green.

## Prompt

Add SMS notifications to the agorasim booking lifecycle. Read
.icm/intake/AGORA-018-sms-notifications.md; reuse the AGORA-010 scheduling and the
email copy in content/emails.ts as the source of message text. Credentials via env vars
only; update privacy.ts for the new processor. Open a PR on a claude/ branch; no local
checks — CI is the source of truth.
