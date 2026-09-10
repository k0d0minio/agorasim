# Stub: Document BACKUP_BLOB_READ_WRITE_TOKEN and the shared CRON_SECRET in web/.env.example

- lane: chore
- found-by: the db-backup-floor PR (claude/db-backup-floor), 2026-09-10 — the session's permission rules deny every `.env*` path, so the file could not be edited
- priority: P1
- size: S
- sources: `web/src/lib/backup-job.ts` header; `web/src/app/api/cron/backup/route.ts`

## Problem

`web/.env.example` documents every variable the app reads, and two facts are now
missing from it: the nightly backup's dedicated private-store token, and that the
one `CRON_SECRET` now guards three cron routes (retention, dispatch, backup). An
operator setting up a fresh environment from the example alone would leave the
backup unconfigured.

## Proposed change

Two edits, no code:

1. Rewrite the `CRON_SECRET` comment so it names all three routes — retention
   (`/api/cron/retention`), the daily dispatcher (`/api/cron/dispatch`) and the
   nightly database backup (`/api/cron/backup`) — one secret for all, sent by
   Vercel Cron as `Authorization: Bearer $CRON_SECRET`; each refuses every request
   when it is unset.
2. Under `BLOB_READ_WRITE_TOKEN`, add a sentence that the backup falls back to this
   token but that this store is PUBLIC and a backup of guests' personal data must
   not go there — every backup write asks for private access, which a public store
   refuses — and add:

   ```
   # Read-write token of a second, PRIVATE Blob store for the nightly database
   # backups — create it in Vercel (Storage → Create → Blob, access "private") in
   # an EU region, since the export is EU residents' personal data. Backups land
   # under backups/YYYY-MM-DD/ and are pruned after 30 days. The same token is
   # what `pnpm db:restore-backup` reads with. The code falls back to
   # BLOB_READ_WRITE_TOKEN above; in practice this one is required.
   BACKUP_BLOB_READ_WRITE_TOKEN=
   ```

## Acceptance criteria (rough)

- [ ] `web/.env.example` carries `BACKUP_BLOB_READ_WRITE_TOKEN=` with the note above
- [ ] The `CRON_SECRET` comment names all three cron routes
- [ ] CI green

## Prompt

In the agorasim repo, read `.icm/intake/triage/env-example-backup-blob-token.md`
and make the two documentation edits it describes to `web/.env.example` (no code
changes). PR on a `claude/` branch; no local checks — CI is the source of truth.
`git mv` this stub to `.icm/intake/triage/_done/` in the same PR.
