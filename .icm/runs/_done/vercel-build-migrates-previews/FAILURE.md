# Failures: vercel-build-migrates-previews

The run's retrospective — what cost a turn, and the rule that would have prevented it. Two
files share this job and split it cleanly: `error.log` (in the stage's `output/`) is the ledger
of errors a **tool** reported, written verbatim at the moment of the fix with its `- resolved:`
and `- rule:` lines, which `retrospective.sh` reads and counts across runs; **this file** is
what the run as a whole learned — a wrong assumption, a STOP, a skipped step, a gate that
blocked, a plan that had to be rewritten — which no tool ever logged. On close-out the
`## Learned rules` bullets below are copied into `_shared/project-rules.md` → Learned rules
(`run-pack.sh <slug> --sync-rules`, called by `close-out.sh`, the same shape as
`retrospective.sh --apply`), so the next run in this repo starts with them. Keep the rules
general; keep the retrospectives specific; never restate an `error.log` entry here.

## Retrospectives

### 2026-09-23 — the security gate blocked the first commit on advisories this branch did not introduce

- what happened: `security-check.sh --staged` reported `dependency-audit: 17 high/critical` and BLOCKED, because the change set touched `web/package.json` (a script line, no dependency) and the audit runs whenever a manifest is in scope
- why: the advisories are the lockfile's own — `next` <16.3.3 (critical), `sharp`, and eslint/shadcn/postcss tooling — and predate the branch; the gate cannot tell a script edit from a dependency change
- fixed by: parking `.icm/intake/triage/dependency-advisories-2026-09-23.md` (lane chore, P1) as the security-audit skill prescribes, completing the `error.log` entry, re-running the gate with `--no-audit` (its secrets scan ran clean), then committing 257fc8f

## Learned rules

- The repo-wide rule from this run is in `error.log` and was promoted by `retrospective.sh --apply`; nothing further here.
