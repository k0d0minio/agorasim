# Stub: env.sh audit loses every key's note when the key declares no targets

- lane: chore
- found-by: template-change · 2026-09-24
- priority: P3

## Problem

`.icm/scripts/env.sh` (template-owned — `T scripts/env.sh` in `.icm/MANIFEST`) reads
`parse_example`'s rows with `while IFS=$'\t' read -r key targets note` (lines 239 and 415).
Tab is an IFS whitespace character, so the two tabs around an empty `targets` field collapse:
`targets` receives the note and `note` is empty. Every `.env.example` key without a
`[targets]` suffix — most of them — is then reported as `[WARN] <KEY>: no note yet
(# TODO: note)` even though its note is there, and its "targets" become the note's text.
Found in the `thankyou-review-email` Build (`env.sh audit --changed`, 2026-09-24):
`RESEND_API_KEY`, `BOOKING_EMAIL_FROM`, `BOOKING_NOTIFICATION_EMAILS` and `CRON_SECRET` all
have multi-line notes in `web/.env.example` and were all warned. The run worked around it
by giving its new key an explicit `# [production,preview,development]` line. Nothing in this
repo consumes this stub; it is a pointer for icm-board.

## Prompt

Template change request — from agorasim · 2026-09-24

In the icm-board repo (`~/Apps`), change the template-owned file
`_system/template/icm-pipeline/scripts/env.sh` (in every pipeline repo: `.icm/scripts/env.sh`,
a `T` line of the MANIFEST). Read `_system/contracts/PIPELINE.md` → File-level ownership first.

What it says today (agorasim's copy, `.icm/template-version`: icm-board e7a99bb):
> `    while IFS=$'\t' read -r key targets note; do` (the audit, line 239)
> `    while IFS=$'\t' read -r key targets note; do` (line 415)
> with `parse_example` printing `key "\t" t "\t" n`, where `t` is empty for a key with no
> `[targets]` suffix.

What it should say or do:
An empty `targets` field must survive the read. Either have `parse_example` print a
placeholder for an empty targets field (for example `-`) and treat `-` as empty where the
rows are read, or split the row with a non-whitespace separator (for example `\x1f`) in both
the printer and every reader. After the change, a key whose note is written as plain comment
lines above it and carries no `[targets]` suffix audits with its note intact (no
`no note yet` warning) and its targets defaulted to `production,preview,development`.
Add the fixture case: an `.env.example` with one key annotated only by a comment line, and
assert `env.sh audit` prints no `[WARN] … no note yet` for it.

Why:
In agorasim's `thankyou-review-email` Build, `env.sh audit --changed` warned "no note yet" for
four keys whose notes exist in `web/.env.example`, and would have for the new
`EMAIL_OPT_OUT_SECRET` had it not been given an explicit `[production,preview,development]`
suffix. Release's stop class 3 re-asks this audit, so a false warning on every repo trains
people to skip the line that matters.

Then: prove it (the fixture, or a read-only run against projects/agorasim on Jamie's
machine), ship it through a PR on a `claude/` branch, and after the merge bring it back with
`_system/scripts/icm-sync.sh --apply projects/agorasim` — the other pipeline repos as
`/icm-check` lists them. Do not edit `projects/agorasim/.icm/scripts/env.sh` in place. Retire
`projects/agorasim/.icm/intake/triage/template-change-env-audit-empty-targets.md` to `_done/`
in the sync commit.
