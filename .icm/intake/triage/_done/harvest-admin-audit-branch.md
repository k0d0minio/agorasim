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

## Progress

- 2026-08-31 — the document was read against today's `main`. Most of it has been
  built out since: `requireAdmin()` in every action, per-user accounts, the audit
  log, rate limiting, honeypot, zod schemas, `ui/` primitives, `admin-nav.ts`,
  error/loading/not-found boundaries, indexes, the optimistic status menu, mobile
  card layouts, the a11y fixes and CI. Five findings survived and were cut:
  `sales-board-search`, `admin-dashboard-what-needs-me`,
  `admin-offline-and-manifest`, `admin-money-view`, `lead-source-attribution` — all
  five now sequenced as the `admin-answers/` epic (2026-08-31 triage).
- 2026-08-31 — Jamie approved deleting all 36 `claude/*` remotes (34 whose PR
  merged, the audited `admin-audit-product-review-pe92tb` now that its document is
  harvested, and `agorasim-availability-capacity-k0iild`). PR #31 was commented and
  closed — its work landed via #38. The deletion itself is all that is left: this
  session's permission classifier refused the delete-refspec push, so it needs a run
  with push rights — `git fetch origin --prune`, then a delete push of every
  `origin/claude/*` ref. Then this stub moves to `_done/`.

## Prompt

In the agorasim repo: `git show origin/claude/admin-audit-product-review-pe92tb:docs/admin-audit-2026-07.md`,
compare each finding against current `web/src/app/admin` + `web/src/components/admin`,
cut a `.icm/intake/triage/` stub per still-valid finding (estate stub format — see
`.icm/intake/README.md`), then ask Jamie before deleting the audited branch and the
stale `claude/*` remotes (list them for him). Ticket-only commits straight to main.

## Closed 2026-08-31

Done. The document was read against `main`, the five surviving findings are cut and
sequenced (`.icm/intake/admin-answers/`), and `origin/claude/admin-audit-product-review-pe92tb`,
`origin/claude/icm-intake-sweep` and `origin/claude/agorasim-availability-capacity-k0iild`
are all gone from origin — the three branches this stub named. PR #31 was commented
and closed; its work landed via #38.

Eighteen `claude/*` remotes survive the wider prune Jamie approved, and triaging that
leftover turned up something the approval had assumed: this repo has no mechanical
signal for "merged" at all — `--merged` returns nothing, the GitHub API says
`merged: false` on every PR including ones whose commit is `main`'s HEAD, and every
branch still diffs against `main`. That is branch hygiene plus an open question, not
this stub's harvest, so it is carried as its own finding rather than holding this one
open: `triage/prune-merged-claude-branches.md`.
