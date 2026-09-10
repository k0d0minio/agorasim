# Stub: The privacy policy catches up with Stripe and Resend

- feature-slug: privacy-refresh
- epic: launch-cutover
- priority: P1
- size: S
- depends-on: none
- sequence: 5 of 14
- sources: legal lens: recipients name only Vercel + Neon (`web/src/content/privacy.ts:112-114`); "We collect nothing else through the site" (`:154`) and "no external systems embedded" (`:184`) false since checkout; Resend is a US processor (transfer point); dangling refs to deleted `.icm/docs/data-protection.md` (`privacy.ts:12`, `retention.ts:11`)

## Problem

The policy predates the payment flow: Stripe (payment data, redirect) and Resend
(emails through a US processor) are absent from the recipients list, and two of the
policy's claims are no longer true. The open-decision register it cites
(`data-protection.md`) was deleted at HEAD.

## Proposed change

Update `content/privacy.ts` both locales: recipients gain Stripe (merchant flow,
what they see) and Resend (transactional email, EEA-transfer safeguard reference);
correct the two false claims; keep the draft banner (it lifts only on §1.1 answers +
counsel sign-off — separate gate). Restore or recreate
`.icm/docs/data-protection.md` (recover `git show` the deleted version) so the two
code citations resolve again, and log the retention-window question there.

## Acceptance criteria (rough)

- [ ] Recipients complete; false claims corrected; PT/EN in sync
- [ ] `data-protection.md` exists again; code citations resolve
- [ ] Draft banner still present; CI green

## Prompt

In the agorasim repo (`web/`), refresh the privacy policy per
`.icm/intake/launch-cutover/privacy-refresh.md`: update
`web/src/content/privacy.ts` (recipients: + Stripe, + Resend with transfer
safeguard wording; correct lines ~154 and ~184; bump lastUpdated, do NOT bump
`MARKETING_CONSENT_VERSION` — consent wording is unchanged), and restore
`.icm/docs/data-protection.md` from git history (deleted at 21d39ea) updating its
open items. Keep the draft banner. PR on a `claude/` branch; no local checks — CI is
the source of truth.
