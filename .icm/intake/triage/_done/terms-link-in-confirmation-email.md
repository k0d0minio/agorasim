# Stub: The booking confirmation email never links the terms of sale

- lane: tweak
- found-by: legal lens (/project) · 2026-09-18
- priority: P2

## Problem

The confirmation restates the cancellation rule and the cancel link but never links the
terms (`web/src/content/emails.ts:96-142`); the withdrawal-right statement lives only on the
checkout page (`terms.ts:271-274`). DL 24/2014 art. 6(1) wants the art. 4 information on a
durable medium — a web page is not one (CJEU C-49/11); the email is.

## Proposed change

A terms-of-sale link (and the one-line withdrawal statement) in the confirmation email, both
locales.

## Prompt

In the agorasim repo (`web/`), read `.icm/intake/triage/terms-link-in-confirmation-email.md`
and add the terms link and withdrawal line to the confirmation email in
`src/content/emails.ts` (PT + EN), covered by the existing email tests. `git mv` the stub to
`_done/` in the PR, on a `claude/` branch; CI is the source of truth.
