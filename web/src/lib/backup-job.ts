/**
 * The nightly export itself: every table in `BACKUP_TABLES` → gzipped NDJSON
 * in a private Vercel Blob store, plus a manifest, then a prune of anything
 * past retention. Scheduled through `app/api/cron/backup`; the pure parts
 * (serialisation, paths, retention arithmetic) live in `lib/backup.ts`.
 *
 * **Which store.** `BACKUP_BLOB_READ_WRITE_TOKEN` if set, else the photo
 * store's `BLOB_READ_WRITE_TOKEN`. Access is a property of a *store* on
 * Vercel — a store is created public or private — and the photo store is
 * public (its images are served straight from `*.public.blob…`), so a
 * backup of guests' names, emails and phone numbers must not go there. Every
 * write here asks for `access: "private"`; against a public store the SDK
 * refuses and the run fails loudly in the function log rather than
 * publishing personal data under an unguessable URL. The intended setup is
 * a second, private store in an EU region with its token in
 * `BACKUP_BLOB_READ_WRITE_TOKEN`.
 *
 * **Idempotent per day.** Paths carry no random suffix and overwrites are
 * allowed, so re-running the job on the same UTC day replaces that day's
 * files rather than piling up copies.
 */
import "server-only";

import { gzipSync } from "node:zlib";

import { del, list, put } from "@vercel/blob";

import { db } from "@/db";
import {
  BACKUP_RETENTION_DAYS,
  BACKUP_ROOT,
  BACKUP_TABLES,
  backupDate,
  backupPathname,
  isExpired,
  manifestPathname,
  toNdjson,
  type BackupManifest,
} from "@/lib/backup";

export type BackupResult = BackupManifest & {
  totalRows: number;
  totalBytes: number;
  /** Objects deleted for being older than {@link BACKUP_RETENTION_DAYS}. */
  pruned: number;
};

/** The token the backup writes with — its own store's, or the photo store's. */
export function backupBlobToken(env: NodeJS.ProcessEnv = process.env): string | undefined {
  return env.BACKUP_BLOB_READ_WRITE_TOKEN || env.BLOB_READ_WRITE_TOKEN || undefined;
}

const PRIVATE = { access: "private", addRandomSuffix: false, allowOverwrite: true } as const;

/** Export every table for the day `now` falls on, then prune. */
export async function runBackup(now: Date = new Date()): Promise<BackupResult> {
  const token = backupBlobToken();
  if (!token) {
    throw new Error(
      "Neither BACKUP_BLOB_READ_WRITE_TOKEN nor BLOB_READ_WRITE_TOKEN is set — nowhere to write the backup.",
    );
  }

  const date = backupDate(now);
  const startedAt = now.toISOString();
  const tables: BackupManifest["tables"] = {};

  for (const spec of BACKUP_TABLES) {
    // The registry is heterogeneous on purpose; the rows are plain objects
    // keyed by the schema's property names, which is all `encodeRow` needs.
    const rows = (await db.select().from(spec.table)) as unknown as Record<string, unknown>[];
    const body = gzipSync(Buffer.from(toNdjson(spec, rows), "utf8"));

    await put(backupPathname(date, spec.name), body, {
      ...PRIVATE,
      token,
      contentType: "application/gzip",
    });

    tables[spec.name] = { rows: rows.length, bytes: body.byteLength };
  }

  const manifest: BackupManifest = {
    date,
    startedAt,
    finishedAt: new Date().toISOString(),
    retentionDays: BACKUP_RETENTION_DAYS,
    tables,
  };
  await put(manifestPathname(date), JSON.stringify(manifest, null, 2), {
    ...PRIVATE,
    token,
    contentType: "application/json",
  });

  const pruned = await pruneExpired(now, token);

  const counts = Object.values(tables);
  return {
    ...manifest,
    totalRows: counts.reduce((sum, t) => sum + t.rows, 0),
    totalBytes: counts.reduce((sum, t) => sum + t.bytes, 0),
    pruned,
  };
}

/**
 * Delete every object under `backups/` whose day is past retention. Only
 * dated backup paths qualify (`isExpired` says no to anything else), so a
 * shared store's other objects are never touched.
 */
async function pruneExpired(now: Date, token: string): Promise<number> {
  const expired: string[] = [];
  let cursor: string | undefined;

  do {
    const page = await list({ prefix: `${BACKUP_ROOT}/`, cursor, token, limit: 1000 });
    for (const blob of page.blobs) {
      if (isExpired(blob.pathname, now)) expired.push(blob.url);
    }
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);

  // `del` takes a batch; keep each request a sensible size.
  for (let i = 0; i < expired.length; i += 100) {
    await del(expired.slice(i, i + 100), { token });
  }

  return expired.length;
}

/** The one-line summary the route logs: per-table counts, size, prune. */
export function summarize(result: BackupResult): string {
  const perTable = Object.entries(result.tables)
    .map(([name, t]) => `${name}=${t.rows}`)
    .join(" ");
  const kb = Math.round(result.totalBytes / 1024);
  return (
    `[backup] ${result.date}: ${result.totalRows} row(s) across ${Object.keys(result.tables).length} table(s), ` +
    `${kb} KB gzipped (${perTable}); pruned ${result.pruned} object(s) older than ${result.retentionDays} days`
  );
}
