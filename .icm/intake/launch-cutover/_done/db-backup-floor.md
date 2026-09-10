# Stub: Nightly database export — the restore floor under Neon's six-hour window

- feature-slug: db-backup-floor
- epic: launch-cutover
- priority: P0
- size: M
- depends-on: none
- sequence: 12 of 14
- sources: Neon free plan — 6-hour point-in-time history, no snapshots; upgrade declined by the owner 2026-09-10; real payments start Saturday 2026-09-12; `web/src/app/api/cron/retention/route.ts` (the cron auth pattern); `@vercel/blob` 2.6.1 already a dependency (`web/package.json`)

## Problem

The production database is on Neon's free plan: six hours of history and no
snapshots. From the first real payment, anything noticed later than six hours
after it happened — a bad migration, a bulk delete from the admin, a compromised
session — has no restore path at all. The owner has declined to upgrade, so the
floor has to be built in the app.

## Proposed change

A third cron route, `/api/cron/backup`, on the same `CRON_SECRET` Bearer check as
retention and dispatch, scheduled daily at 02:30 UTC (clear of the 03:00 Monday
retention and the 06:00 dispatch). It exports every business table via Drizzle as
gzipped NDJSON into a **private** Vercel Blob store under
`backups/YYYY-MM-DD/<table>.ndjson.gz` (+ a `manifest.json` of row counts), prunes
objects older than 30 days in the same run, logs one summary line and writes a
`cron.backup` audit entry. `admin_users` is exported without password digests.
`pnpm db:restore-backup` reads a day back and upserts it into `DATABASE_URL`,
dry-run by default, `--yes` to write. Serialisation is unit-tested (timestamps,
numerics, jsonb round-trip; the registry covers every schema table).

## Acceptance criteria (rough)

- [ ] `vercel.json` schedules `/api/cron/backup` daily; the route refuses without `CRON_SECRET`
- [ ] A day's folder in the Blob store holds one `.ndjson.gz` per business table and a manifest
- [ ] Objects older than 30 days are gone after a run
- [ ] `pnpm db:restore-backup -- --date <day>` dry-runs; `--yes` restores into a fresh Neon branch
- [ ] Blob store is private and in an EU region (Jamie confirms in Vercel)
- [ ] CI green

## Prompt

In the agorasim repo, read `.icm/intake/launch-cutover/_done/db-backup-floor.md`
and the PR that finished it. The work is done; this stub records what and why.
Restore drill: create a Neon branch, point `DATABASE_URL` at it, run
`cd web && pnpm db:restore-backup -- --list`, then `--date <day>` (dry run) and
`--date <day> --yes`, and check the row counts against the manifest.
