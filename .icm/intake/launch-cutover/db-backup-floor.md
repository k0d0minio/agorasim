# Stub: A restore floor for the booking data that does not depend on Neon's free tier

- feature-slug: db-backup-floor
- epic: launch-cutover
- priority: P0  (Neon upgrade declined 2026-09-10 — this export is the only restore path beyond 6 h)
- size: S
- depends-on: none
- sequence: 12 of 14
- sources: Neon project `agorasim` (eu-central-1) on 2026-09-10: **free plan, `history_retention_seconds: 21600` (6 h), no snapshot schedule**; `vercel.json` already runs two crons; Vercel Blob already connected (`BLOB_READ_WRITE_TOKEN`)

## Problem

"Their back office data needs to remain intact" currently rests on a six-hour undo
window. A bad migration noticed Monday morning, or a mistaken bulk sweep on the
calendar found the next day, is unrecoverable. Manual snapshots before cutover (runbook
Track A) cover the weekend only.

## Proposed change

A nightly cron route (`/api/cron/backup`, `CRON_SECRET`-gated like the others) that
streams a logical export — `bookings`, `booking` child tables, `tour_requests`,
`quotes` + payments, `admin_users` (no password hashes), `audit_log`, experiences and
calendar — as gzipped JSON to a private Vercel Blob path with a 30-day rolling
retention. Plus a documented `pnpm db:restore-json <file>` for the day it is needed.
Independently: recommend the Neon *Launch* plan (7-day PITR + scheduled snapshots) in
the runbook — the code floor is the belt, the plan is the braces.

## Acceptance criteria (rough)

- [ ] Nightly export lands in Blob; PII stays inside the EU (Blob store region checked)
- [ ] Restore script documented and exercised once against a Neon branch
- [ ] CI green

## Prompt

In the agorasim repo (`web/`), read `.icm/intake/launch-cutover/db-backup-floor.md` and
add the nightly logical export cron (pattern: `web/src/app/api/cron/retention`), the
`vercel.json` schedule, and a restore script under `web/scripts/`. Never include
password hashes or session secrets in the export. PR on a `claude/` branch; no local
checks — CI is the source of truth.
