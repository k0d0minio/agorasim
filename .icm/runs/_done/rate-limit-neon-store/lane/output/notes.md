# Chore: rate-limit-neon-store

- invariant: same call sites, same limits (`RateLimitRule` values, one
  tightened deliberately — see below), same `RateLimitStore` interface; only
  where a hit is counted changes.
- change: `web/src/db/schema.ts`: added `rateLimitWindows` (`rate_limit_windows`),
  one row per fixed-window key with an index on `resetAt` for the sweep —
  `web/drizzle/0033_rate_limit_windows.sql`. `web/src/lib/rate-limit.ts`: added
  `createNeonRateLimitStore`, backing `RateLimitStore` with a single upserting
  `INSERT … ON CONFLICT` statement (atomic across instances — no
  read-then-write race) plus an opportunistic sweep (~1 in 200 hits) of
  windows closed over a day ago; `rateLimitStore` now picks the Neon store
  when `DATABASE_URL` is set and falls back to the existing in-memory store
  otherwise (local dev with no database configured). `LOGIN_RATE_LIMIT`
  tightened from 8/15min to 5/15min — modestly stricter now that the count
  survives a redeploy instead of resetting on cold start. Tests:
  `web/src/lib/rate-limit.test.ts` adds a `createNeonRateLimitStore` suite
  against a fake Neon table (interprets the drizzle `sql` template's
  `queryChunks` rather than hitting a real database) covering allow/block,
  window rollover, per-key isolation, the sweep, and — the point of the
  change — that two independent store instances sharing the same fake table
  enforce one shared window, which the in-memory store cannot.
- rollback: forward-only (`migrations.reversible: false` in
  `.icm/project.json`). A code revert tolerates the newer schema: dropping
  `createNeonRateLimitStore` and reverting to the in-memory-only store leaves
  `rate_limit_windows` as an unused table — no code depends on its absence.
  Dropping the table itself (if ever wanted) is a separate, later migration.
- learned: none.
