# Stub: Untrack and redact the credential-bearing info PDF

- feature-slug: untrack-credential-pdfs
- epic: secure-client-data
- priority: P0
- size: S
- depends-on: rotate-registrar-credential
- sequence: 2 of 2
- sources: `git ls-files .icm/docs` vs `.gitignore:3-5` (which already says "agorasim-info.pdf holds credentials/IBAN, never commit"); purged AGORA-020; estate rule "no secrets in git, ever"

## Problem

`.icm/docs/agorasim-info.pdf` is tracked in git despite the `.gitignore` comment saying
it never should be. It contains the (now-rotated) registrar password, the client's
IBAN, and personal data. It was also in the repo's public history until 2026-08-29.

## Proposed change

Replace the tracked file with a **redacted** copy (credentials and IBAN struck; the
operational answers — availability, cars, testimonials, §2.6 message copy — preserved,
since sessions rely on them), `git rm --cached` the original, and keep the original
only on Jamie's disk (gitignored). Decide the history question explicitly with Jamie:
now that the repo is private and the password rotated, a full history rewrite
(`git filter-repo`) is optional — recommend doing it anyway since the repo was public;
if done, coordinate the force-push with Jamie because every clone breaks.

## Acceptance criteria (rough)

- [ ] `git ls-files` no longer lists an unredacted `agorasim-info.pdf`
- [ ] Redacted copy keeps §1.5, §2.1–2.6 content sessions cite
- [ ] History decision recorded (done, or explicitly declined with reason)
- [ ] CI green

## Prompt

In the agorasim repo: `.icm/docs/agorasim-info.pdf` is git-tracked but contains a
registrar password (rotated — see `.icm/intake/secure-client-data/_done/` or git log)
and the client's IBAN; `.gitignore` lines 3–5 already declare it must never be
committed. Produce a redacted PDF (or a markdown transcription of the operational
content only) at `.icm/docs/agorasim-info-redacted.md`, remove the original from
tracking while leaving it on disk, and verify `.gitignore` covers it. Ask Jamie
whether to purge history with git-filter-repo before doing so — the repo was public
until 2026-08-29, so recommend yes, but it is his call and his force-push. Open a PR
on a `claude/` branch for the redaction commit; do not run local checks — CI is the
source of truth.
