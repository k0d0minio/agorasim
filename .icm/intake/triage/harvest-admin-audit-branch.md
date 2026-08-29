# Stub: Harvest the stranded July admin audit branch

- lane: chore
- found-by: ticket-scout · 2026-08-29
- priority: P2

## Problem

A 485-line admin code/UX/product audit (`docs/admin-audit-2026-07.md`) sits unmerged
on `origin/claude/admin-audit-product-review-pe92tb` (23f55fe). Its findings predate
ten weeks of admin work — some are fixed, some may still be live, none are tracked.

## Proposed change

Read the branch's document against today's main: extract still-valid findings as
triage stubs (drop bias applies — only what's obviously still real), then delete the
branch (the document's value is the surviving findings, not the file). Also delete
`origin/claude/icm-intake-sweep` (obsolete ticket-status commit superseded by the
D14 purge) and the other long-merged `claude/*` remote branches in the same pass.

## Prompt

In the agorasim repo: `git show origin/claude/admin-audit-product-review-pe92tb:docs/admin-audit-2026-07.md`,
compare each finding against current `web/src/app/admin` + `web/src/components/admin`,
cut a `.icm/intake/triage/` stub per still-valid finding (estate stub format — see
`.icm/intake/README.md`), then ask Jamie before deleting the audited branch and the
stale `claude/*` remotes (list them for him). Ticket-only commits straight to main.
