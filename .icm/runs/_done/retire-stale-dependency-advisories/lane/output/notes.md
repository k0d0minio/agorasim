# Chore: retire-stale-dependency-advisories

- invariant: no user-facing behaviour changed; `pnpm audit --audit-level=high` (web/) already read
  0 high, 0 critical before this run — `next` was already 16.3.4 (patches the ≥16.0.0 <16.3.3
  critical) and `sharp` already 0.35.4 (patches the <0.35.4 high) on `main`/`uat`. The stub
  `triage/dependency-advisories-2026-09-23.md` (and the two Learned rules it and an earlier,
  related `next-rce-advisories` finding produced) predate that fix landing, so no dependency bump
  was needed here.
- change: `.icm/_shared/project-rules.md` — removed the two stale Learned-rule blocks that told
  every lane touching `web/package.json` or the lockfile to skip `security-check.sh`'s audit with
  `--no-audit` "until the stub ships". `security-check.sh --branch` now runs the audit clean
  (`RESULT: OK`, no `--no-audit` override) — verified before this run's push.
- rollback: forward-only; reverting restores two rule lines that would once again tell lanes to
  skip an audit that is already clean — no code or schema to roll back.
- learned: none (retrospective.sh: SKIP — nothing in error.log)
