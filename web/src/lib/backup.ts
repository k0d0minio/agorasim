/**
 * Nightly database backup — the pure half: which tables, how a row becomes a
 * line of NDJSON and comes back, where a day's files live in the Blob store,
 * and when a day is old enough to prune.
 *
 * **Why this exists.** Neon's free plan keeps six hours of point-in-time
 * history and takes no snapshots, and the owner declined to upgrade. From the
 * first real payment (Saturday 2026-09-12) a mistake noticed on Monday morning
 * — a bad migration, a bulk delete, a compromised admin session — has no
 * restore path at all. This export is that path: one gzipped NDJSON file per
 * table per day in a *private* Vercel Blob store, kept for
 * {@link BACKUP_RETENTION_DAYS}, and a script (`scripts/restore-backup.ts`)
 * that upserts a day's files into whatever `DATABASE_URL` points at.
 *
 * **Why NDJSON rather than `pg_dump`.** The runtime is a Vercel function over
 * Neon's HTTP driver — there is no `pg_dump` binary and no TCP socket. Drizzle
 * already knows every column's type, so a row can be written as JSON and read
 * back with only two conversions ({@link encodeRow} / {@link decodeRow}):
 * timestamps travel as ISO-8601 strings and come back as `Date`s; numerics
 * are strings on both sides already; `jsonb` is JSON already. Everything else
 * (uuid, text, enum, integer, boolean, `date`) is representable as-is.
 *
 * **Schema-driven decoding, not value-sniffing.** A string is turned back into
 * a `Date` only when the *column* is a `timestamp` — never because it looks
 * like one — so a guest whose message is an ISO date, or a `jsonb` payload
 * carrying one, survives the round trip byte for byte.
 *
 * **What is left out.** `admin_users.password_hash` is never exported: a
 * backup that leaks is bad enough without handing over the operators' scrypt
 * digests. A restored account gets {@link UNUSABLE_PASSWORD_HASH} instead,
 * which `verifyPassword` rejects, and the operator sets a new password with
 * `pnpm db:reset-password`. Nothing else is redacted — the point of a backup
 * is that it is complete — which is why the store must be private and, since
 * this is EU residents' personal data, in an EU region.
 *
 * Nothing in this module touches the database or the network; that is
 * `lib/backup-job.ts` (export) and `scripts/restore-backup.ts` (import).
 */
import "server-only";

import { getTableColumns, sql, type SQL } from "drizzle-orm";
import type { PgColumn, PgTable } from "drizzle-orm/pg-core";

import {
  adminUsers,
  auditLog,
  availability,
  blogPostDrafts,
  bookings,
  emailCampaignDrafts,
  emailOptOuts,
  experienceCatalogue,
  featureRequests,
  geoContentDrafts,
  messageLog,
  quotePayments,
  quotes,
  socialPostDrafts,
  tourRequests,
} from "@/db/schema";

export type BackupTable = {
  /** The Postgres table name; doubles as the file name inside a day's folder. */
  name: string;
  table: PgTable;
  /** Drizzle property names never written to a backup and never restored. */
  redact: readonly string[];
};

/**
 * Every business table, **in restore order**: a table is listed after every
 * table it has a foreign key into, so a full restore into an empty database
 * never trips a constraint. `admin_users` first (audit, quotes and feature
 * requests point at it), `tour_requests` before `bookings` and `quotes`,
 * `quotes` before `quote_payments`, `bookings` before `message_log`.
 *
 * The test suite checks this list against the schema: every `pgTable` the
 * schema exports must be here, so a new table cannot quietly go unbacked-up.
 */
export const BACKUP_TABLES: readonly BackupTable[] = [
  { name: "admin_users", table: adminUsers, redact: ["passwordHash"] },
  { name: "experiences", table: experienceCatalogue, redact: [] },
  { name: "availability", table: availability, redact: [] },
  { name: "tour_requests", table: tourRequests, redact: [] },
  { name: "bookings", table: bookings, redact: [] },
  { name: "quotes", table: quotes, redact: [] },
  { name: "quote_payments", table: quotePayments, redact: [] },
  { name: "message_log", table: messageLog, redact: [] },
  // Keyed hashes, no addresses — and the one table a restore must not lose:
  // an empty list silently re-subscribes everyone who opted out.
  { name: "email_opt_outs", table: emailOptOuts, redact: [] },
  { name: "feature_requests", table: featureRequests, redact: [] },
  { name: "audit_log", table: auditLog, redact: [] },
  { name: "geo_content_drafts", table: geoContentDrafts, redact: [] },
  { name: "blog_post_drafts", table: blogPostDrafts, redact: [] },
  { name: "social_post_drafts", table: socialPostDrafts, redact: [] },
  { name: "email_campaign_drafts", table: emailCampaignDrafts, redact: [] },
];

/** Look a table up by its Postgres name, e.g. for a `--tables` flag. */
export function findBackupTable(name: string): BackupTable | undefined {
  return BACKUP_TABLES.find((t) => t.name === name);
}

/**
 * What a restored `admin_users` row gets in place of the digest the backup
 * never carried. Three `$`-separated parts where a real digest has six, so
 * `parseDigest` in `lib/password.ts` returns null and `verifyPassword`
 * returns false for every candidate — the account exists, keeps its role and
 * its audit history, and cannot be signed into until `pnpm db:reset-password`
 * gives it a real password.
 */
export const UNUSABLE_PASSWORD_HASH = "restored$no-password$run-db:reset-password";

// ---------------------------------------------------------------------------
// Rows ⇄ JSON
// ---------------------------------------------------------------------------

/** A row as it appears on one line of a backup file. */
export type BackupRow = Record<string, unknown>;

/** The columns a backup carries for a table: everything except the redacted. */
export function backupColumns(spec: BackupTable): Record<string, PgColumn> {
  const columns: Record<string, PgColumn> = {};
  for (const [key, column] of Object.entries(getTableColumns(spec.table))) {
    if (!spec.redact.includes(key)) columns[key] = column;
  }
  return columns;
}

/** The single primary-key column of a backed-up table. */
export function primaryKeyColumn(spec: BackupTable): PgColumn {
  const keys = Object.values(getTableColumns(spec.table)).filter((c) => c.primary);
  const [key] = keys;
  if (keys.length !== 1 || !key) {
    throw new Error(
      `${spec.name} has ${keys.length} primary-key columns; the restore upsert needs exactly one`,
    );
  }
  return key;
}

/**
 * A selected row → a JSON-safe object. `Date`s become ISO-8601 strings;
 * redacted columns are dropped; everything else is already JSON.
 */
export function encodeRow(spec: BackupTable, row: Record<string, unknown>): BackupRow {
  const out: BackupRow = {};
  for (const key of Object.keys(backupColumns(spec))) {
    const value = row[key];
    out[key] = value instanceof Date ? value.toISOString() : value === undefined ? null : value;
  }
  return out;
}

/**
 * A line of a backup file → an object Drizzle can insert.
 *
 * Only columns the *current* schema knows are read, and only when the file
 * has them: a column dropped since the backup is ignored, a column added
 * since is left out so its default applies. `timestamp` columns — Drizzle
 * data type `date` — are revived to `Date`; nothing else is touched.
 */
export function decodeRow(spec: BackupTable, encoded: BackupRow): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, column] of Object.entries(backupColumns(spec))) {
    if (!Object.prototype.hasOwnProperty.call(encoded, key)) continue;
    const value = encoded[key];
    out[key] =
      column.dataType === "date" && typeof value === "string" ? new Date(value) : value;
  }
  return out;
}

/** Rows → NDJSON: one JSON object per line, newline-terminated. */
export function toNdjson(spec: BackupTable, rows: Record<string, unknown>[]): string {
  return rows.map((row) => `${JSON.stringify(encodeRow(spec, row))}\n`).join("");
}

/** NDJSON → rows, tolerant of blank lines and a missing final newline. */
export function parseNdjson(spec: BackupTable, text: string): Record<string, unknown>[] {
  return text
    .split("\n")
    .filter((line) => line.trim() !== "")
    .map((line) => decodeRow(spec, JSON.parse(line) as BackupRow));
}

/**
 * The `SET` half of the restore upsert: every non-key, non-redacted column
 * takes the incoming row's value (`excluded.<column>`), so a row that already
 * exists is overwritten with the backup's version and a row that does not is
 * inserted. The key never changes and the redacted columns are never named,
 * so a restored operator keeps whatever password the live row already has.
 */
export function restoreUpsertSet(spec: BackupTable): Record<string, SQL> {
  const set: Record<string, SQL> = {};
  for (const [key, column] of Object.entries(backupColumns(spec))) {
    if (column.primary) continue;
    // Column names come from our own schema, never from the file.
    set[key] = sql.raw(`excluded."${column.name}"`);
  }
  return set;
}

// ---------------------------------------------------------------------------
// Where a day lives, and for how long
// ---------------------------------------------------------------------------

/** Top-level folder in the Blob store. Every backup object sits under it. */
export const BACKUP_ROOT = "backups";

/** Days a backup is kept before the nightly run deletes it. */
export const BACKUP_RETENTION_DAYS = 30;

/** Per-day summary written next to the tables: row counts and timing. */
export const MANIFEST_NAME = "manifest.json";

/** The calendar day, UTC, a run belongs to: `YYYY-MM-DD`. */
export function backupDate(now: Date): string {
  return now.toISOString().slice(0, 10);
}

/** `backups/YYYY-MM-DD/` — the folder one run writes into. */
export function backupFolder(date: string): string {
  return `${BACKUP_ROOT}/${date}/`;
}

/** `backups/YYYY-MM-DD/<table>.ndjson.gz`. */
export function backupPathname(date: string, tableName: string): string {
  return `${backupFolder(date)}${tableName}.ndjson.gz`;
}

/** `backups/YYYY-MM-DD/manifest.json`. */
export function manifestPathname(date: string): string {
  return `${backupFolder(date)}${MANIFEST_NAME}`;
}

const DATED_PATH = /^backups\/(\d{4}-\d{2}-\d{2})\//;

/** The day a backup object belongs to, or null for anything not shaped like one. */
export function backupDateOf(pathname: string): string | null {
  return DATED_PATH.exec(pathname)?.[1] ?? null;
}

/**
 * Whether an object is past retention: its day is strictly older than
 * `retentionDays` before `now`. A 30-day-old backup is kept; a 31-day-old one
 * goes. Anything without a recognisable day is never expired — the prune
 * deletes only what the backup itself wrote.
 */
export function isExpired(
  pathname: string,
  now: Date,
  retentionDays: number = BACKUP_RETENTION_DAYS,
): boolean {
  const date = backupDateOf(pathname);
  if (!date) return false;
  const cutoff = new Date(now.getTime() - retentionDays * 24 * 60 * 60 * 1000);
  // Both are `YYYY-MM-DD`, so string order is date order.
  return date < backupDate(cutoff);
}

/** What `manifest.json` holds. */
export type BackupManifest = {
  date: string;
  startedAt: string;
  finishedAt: string;
  retentionDays: number;
  tables: Record<string, { rows: number; bytes: number }>;
};
