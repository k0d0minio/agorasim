/**
 * Restore a day's backup into a database — the other half of
 * `app/api/cron/backup`.
 *
 *   cd web
 *   pnpm db:restore-backup -- --list                         # which days exist
 *   pnpm db:restore-backup -- --date 2026-09-12              # dry run: what would change
 *   pnpm db:restore-backup -- --date 2026-09-12 --yes        # do it
 *   pnpm db:restore-backup -- --date 2026-09-12 --tables bookings,tour_requests --yes
 *
 * Reads `backups/<date>/<table>.ndjson.gz` from the Blob store
 * (`BACKUP_BLOB_READ_WRITE_TOKEN`, else `BLOB_READ_WRITE_TOKEN`) and upserts
 * every row into the database at `DATABASE_URL` — **the target is whatever
 * `.env.local` or the shell points at**, so the host is printed before
 * anything happens. Point it at a fresh Neon branch or project first if the
 * live database is not what you mean to overwrite.
 *
 * **Dry run by default.** Without `--yes` the script downloads, decodes and
 * counts, prints the plan and writes nothing. `--yes` performs the upserts:
 * a row whose id exists is overwritten with the backup's version, a row
 * whose id does not is inserted, and rows that exist only in the target are
 * left alone — this restores what was lost, it does not roll the database
 * back to the backup. Tables go in foreign-key order (`BACKUP_TABLES`), in
 * batches, and a failure in one table is reported and the rest continue.
 *
 * **Operators come back locked out.** The backup never carries password
 * digests, so a restored `admin_users` row that did not already exist gets
 * `UNUSABLE_PASSWORD_HASH` and must be given a password with
 * `pnpm db:reset-password`. An account that already exists keeps the password
 * it has.
 *
 * Run via `tsx` for the same two reasons as `seed-owner.ts` — `@/…` path
 * resolution, and `--conditions=react-server` so the `server-only` marker
 * resolves to its empty build outside a React Server Component.
 */
import { gunzipSync } from "node:zlib";

import { neon } from "@neondatabase/serverless";
import { get, list } from "@vercel/blob";
import { config } from "dotenv";
import { drizzle } from "drizzle-orm/neon-http";

import * as schema from "@/db/schema";
import {
  BACKUP_ROOT,
  BACKUP_TABLES,
  UNUSABLE_PASSWORD_HASH,
  backupPathname,
  findBackupTable,
  manifestPathname,
  parseNdjson,
  primaryKeyColumn,
  restoreUpsertSet,
  type BackupManifest,
  type BackupTable,
} from "@/lib/backup";

config({ path: ".env.local" });
config({ path: ".env" });

/** Rows per INSERT — well inside Postgres's 65 535 bind-parameter limit. */
const BATCH = 100;

type Args = {
  list: boolean;
  date: string | null;
  tables: string[] | null;
  yes: boolean;
};

function parseArgs(argv: string[]): Args {
  const args: Args = { list: false, date: null, tables: null, yes: false };
  let dryRun = false;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = () => {
      const value = argv[i + 1];
      if (!value || value.startsWith("--")) throw new Error(`${arg} needs a value`);
      i += 1;
      return value;
    };
    switch (arg) {
      case "--list":
        args.list = true;
        break;
      case "--date":
        args.date = next();
        break;
      case "--tables":
        args.tables = next().split(",").map((s) => s.trim()).filter(Boolean);
        break;
      case "--yes":
        args.yes = true;
        break;
      case "--dry-run":
        dryRun = true;
        break;
      default:
        throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (dryRun && args.yes) throw new Error("--dry-run and --yes contradict each other.");
  return args;
}

function blobToken(): string {
  const token = process.env.BACKUP_BLOB_READ_WRITE_TOKEN || process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    throw new Error(
      "Neither BACKUP_BLOB_READ_WRITE_TOKEN nor BLOB_READ_WRITE_TOKEN is set — nowhere to read the backup from.",
    );
  }
  return token;
}

/** Host and database of a connection string, never its credentials. */
function describeTarget(url: string): string {
  try {
    const u = new URL(url);
    return `${u.hostname}${u.pathname}`;
  } catch {
    return "(unparseable DATABASE_URL)";
  }
}

async function listDays(token: string): Promise<string[]> {
  const days = new Set<string>();
  let cursor: string | undefined;
  do {
    const page = await list({ prefix: `${BACKUP_ROOT}/`, mode: "folded", cursor, token });
    for (const folder of page.folders) {
      const day = folder.slice(BACKUP_ROOT.length + 1).replace(/\/$/, "");
      if (/^\d{4}-\d{2}-\d{2}$/.test(day)) days.add(day);
    }
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
  return [...days].sort();
}

async function download(pathname: string, token: string): Promise<Buffer | null> {
  const result = await get(pathname, { access: "private", token, useCache: false });
  if (!result || result.statusCode !== 200) return null;
  return Buffer.from(await new Response(result.stream).arrayBuffer());
}

async function loadTable(
  spec: BackupTable,
  date: string,
  token: string,
): Promise<Record<string, unknown>[] | null> {
  const body = await download(backupPathname(date, spec.name), token);
  if (!body) return null;
  const rows = parseNdjson(spec, gunzipSync(body).toString("utf8"));

  if (spec.name === "admin_users") {
    // The digest was never exported; a new account arrives unusable until
    // `pnpm db:reset-password`. The upsert's SET never names this column, so
    // an existing account keeps the password it has.
    for (const row of rows) row.passwordHash = UNUSABLE_PASSWORD_HASH;
  }

  return rows;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const token = blobToken();

  if (args.list) {
    const days = await listDays(token);
    if (days.length === 0) {
      console.info("[restore] no backups found under backups/");
    } else {
      console.info(`[restore] ${days.length} day(s) available:`);
      for (const day of days) console.info(`  ${day}`);
    }
    return;
  }

  if (!args.date || !/^\d{4}-\d{2}-\d{2}$/.test(args.date)) {
    throw new Error("Pass --date YYYY-MM-DD (see --list), or --list.");
  }
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set — nothing to restore into.");

  const specs = args.tables
    ? args.tables.map((name) => {
        const spec = findBackupTable(name);
        if (!spec) {
          throw new Error(
            `Unknown table "${name}". Known: ${BACKUP_TABLES.map((t) => t.name).join(", ")}`,
          );
        }
        return spec;
      })
    : [...BACKUP_TABLES];
  // Always in registry (foreign-key) order, whatever order --tables gave.
  specs.sort((a, b) => BACKUP_TABLES.indexOf(a) - BACKUP_TABLES.indexOf(b));

  const manifestBody = await download(manifestPathname(args.date), token);
  const manifest = manifestBody
    ? (JSON.parse(manifestBody.toString("utf8")) as BackupManifest)
    : null;
  if (!manifest) {
    console.warn(`[restore] no manifest for ${args.date} — the day may be incomplete.`);
  }

  console.info(
    `[restore] ${args.date} → ${describeTarget(url)} (${args.yes ? "WRITING" : "dry run"})`,
  );

  const loaded: { spec: BackupTable; rows: Record<string, unknown>[] }[] = [];
  for (const spec of specs) {
    const rows = await loadTable(spec, args.date, token);
    if (rows === null) {
      console.warn(`  ${spec.name}: no file for this day — skipped`);
      continue;
    }
    const expected = manifest?.tables[spec.name]?.rows;
    const note = expected !== undefined && expected !== rows.length ? ` (manifest says ${expected})` : "";
    console.info(`  ${spec.name}: ${rows.length} row(s)${note}`);
    loaded.push({ spec, rows });
  }

  if (!args.yes) {
    console.info("[restore] dry run — nothing written. Re-run with --yes to upsert these rows.");
    return;
  }

  const db = drizzle(neon(url), { schema });
  const failures: string[] = [];

  for (const { spec, rows } of loaded) {
    if (rows.length === 0) continue;
    const target = primaryKeyColumn(spec);
    const set = restoreUpsertSet(spec);
    let written = 0;
    try {
      for (let i = 0; i < rows.length; i += BATCH) {
        const batch = rows.slice(i, i + BATCH);
        // The registry is heterogeneous by design, so the rows and the SET
        // clause are built generically and cannot satisfy one table's
        // inferred insert type; the shapes are guaranteed by `lib/backup.ts`.
        await db
          .insert(spec.table)
          .values(batch as never)
          .onConflictDoUpdate({ target, set: set as never });
        written += batch.length;
      }
      console.info(`  ${spec.name}: upserted ${written} row(s)`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`  ${spec.name}: failed after ${written} row(s) — ${message}`);
      failures.push(spec.name);
    }
  }

  if (failures.length > 0) {
    throw new Error(
      `${failures.length} table(s) failed: ${failures.join(", ")}. The others were written; fix the cause and re-run with --tables for the failed ones.`,
    );
  }

  if (loaded.some(({ spec, rows }) => spec.name === "admin_users" && rows.length > 0)) {
    console.warn(
      "[restore] admin accounts that did not already exist have no usable password — set one with `pnpm db:reset-password`.",
    );
  }
  console.info(`[restore] done — ${args.date} restored into ${describeTarget(url)}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
