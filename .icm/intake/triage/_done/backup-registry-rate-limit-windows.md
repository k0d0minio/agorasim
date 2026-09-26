# Stub: The backup registry test fails on main — `rate_limit_windows` is not registered
> Done elsewhere — retired 2026-09-26 (estate audit): fixed by 6054226 (#157) — `web/src/lib/backup.ts:95` registers `rate_limit_windows`; the privacy sub-question (exclude IP-keyed counters) was never decided and is not carried.

- lane: bug
- found-by: event-holds-capacity (Build, advisory quality job on #155) · 2026-09-25
- complexity: low
- priority: P1

## Problem

`rate-limit-neon-store` (#156) added the `rate_limit_windows` table to `web/src/db/schema.ts`
but not to `BACKUP_TABLES` in `web/src/lib/backup.ts`. `web/src/lib/backup.test.ts` →
"covers every table the schema exports, so a new table cannot go unbacked-up" asserts the two
lists are equal, so `Quality (advisory)` is red on every PR carrying `main` since `ea53a7b`:

```
- Expected
+ Received
    "quotes",
-   "rate_limit_windows",
    "social_post_drafts",
```

The advisory job does not run on `main`, which is why the merge did not show it.

## Proposed change

Decide whether the table belongs in the nightly backup. Its rows are short-lived throttle
counters keyed by caller (likely IP-derived), so a restore has no use for them and a backup
would copy personal data for nothing: prefer an explicit, commented exclusion list in
`backup.ts` (e.g. `BACKUP_EXCLUDED_TABLES = ["rate_limit_windows"]`) that the test subtracts
from the schema's tables, over registering the table. If it is kept in the backup instead, add
`{ name: "rate_limit_windows", table: rateLimitWindows, redact: [] }` to `BACKUP_TABLES`.

## Prompt

In the agorasim repo, read `.icm/intake/triage/backup-registry-rate-limit-windows.md`. Make
`web/src/lib/backup.test.ts` green on `main` by either excluding `rate_limit_windows` from the
backup through an explicit, documented exclusion list in `web/src/lib/backup.ts` (preferred —
ephemeral throttle state, possibly IP-keyed) or registering it in `BACKUP_TABLES`; check
`.icm/docs/data-protection.md` if the choice changes what the backup holds. `git mv` the stub
to `_done/` in the PR, on a `claude/` branch; CI is the source of truth.
