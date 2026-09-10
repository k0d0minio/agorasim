# Stub: Restore the launch runbook from history

- feature-slug: restore-runbook
- epic: launch-cutover
- priority: P1
- size: S
- depends-on: none
- sequence: 1 of 8
- sources: ticket-scout 2026-08-29: HEAD commit 21d39ea ("file update") deleted `.icm/docs/launch-runbook.md` (+ launch-plan, information-request, social spike, all `.icm/files/*.docx` — 761 deletions); last good version `d4d3fc4:.icm/docs/launch-runbook.md`; DEAL.md corrections of 2026-08-27 (three stale facts fixed there)

## Problem

The only record of the cutover sequence — DNS steps at controlpanel.pro, **MX
preservation so info@agorasim.pt keeps working** (the client's explicit worry), the
€1 live test + refund walkthrough, rollback values — was deleted at HEAD and exists
only in git history. Doing the switch from memory risks exactly the mail outage the
client feared.

## Proposed change

`git show d4d3fc4:.icm/docs/launch-runbook.md` → restore to `.icm/docs/`, then
correct what changed since: sandbox-first objective (no promised date), repo now
private, credential rotation done (secure-client-data), commission engine status,
and strip any credential the old runbook carried (it referenced the plaintext
password — the restored copy must not).
Track H also gains the old-URL check that `old-site-redirects` shipped without a
runbook to write to: `curl -I` each WordPress path on the live host — the pages 301
onto `/pt/…`, the machinery paths (`/feed`, `/wp-json`, `/xmlrpc.php`, `/wp-content/*`,
`/wp-admin/*`, `/wp-login.php`) answer 410.

## Acceptance criteria (rough)

- [ ] Runbook on disk, facts current, zero credentials in it
- [ ] MX-preservation steps intact and explicit
- [ ] Human steps clearly marked as Jamie's checkboxes

## Prompt

In the agorasim repo, restore the launch runbook per
`.icm/intake/launch-cutover/restore-runbook.md`: recover
`git show d4d3fc4:.icm/docs/launch-runbook.md`, place it at
`.icm/docs/launch-runbook.md`, update its facts against `.icm/project.md` (D15/D16,
sandbox-first objective) and the icm-board deal folder, and remove any embedded
credential (the old version recorded the registrar password — replace with "in
password manager"). Its checklists are Jamie's to tick — never tick them. Ticket-only
commit conventions apply (docs commit straight to main is fine per repo rules if no
code changes; otherwise PR on a `claude/` branch).
