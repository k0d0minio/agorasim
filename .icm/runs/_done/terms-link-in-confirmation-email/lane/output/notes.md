# Tweak: terms-link-in-confirmation-email

- change: `web/src/content/emails.ts` + `web/src/lib/booking-emails.ts`: the guest
  confirmation carried the cancellation rule and the cancel link but never the terms →
  it now carries the one-line withdrawal statement with `/{locale}/termos` linked in the
  HTML footer, and the same sentence plus a bare URL in the plain text part. PT + EN.
- changelog: announce: none (the repo keeps no changelog — `_shared/project-rules.md`)
