/**
 * Refuse to call a migration run done while any journal entry is not in the
 * database.
 *
 *   cd web && pnpm db:verify
 *
 * `drizzle-kit migrate` applies only journal entries stamped later than the
 * newest row in `__drizzle_migrations`, and reports success whether or not
 * that left anything behind. It did in September 2026: 0016 and 0017 carried
 * `when` stamps older than 0015's, were never applied, and checkout failed on
 * a column the schema had and the database did not. `drizzle-kit` gave no
 * hint. This script compares the SHA-256 of every journal file — the hash
 * Drizzle itself records — against the applied rows and exits non-zero on any
 * gap, so the DB migrate workflow goes red instead of quietly shipping a
 * schema the code cannot write to.
 *
 * Read-only: it never applies anything. The fix for a gap is in the journal
 * (`src/db/migrations-journal.test.ts` says how), not here.
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";

config({ path: ".env.local" });
config({ path: ".env" });

const drizzleDir = join(process.cwd(), "drizzle");

type JournalEntry = { idx: number; when: number; tag: string };

async function main(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set — nothing to verify against.");
  }

  const { entries } = JSON.parse(
    readFileSync(join(drizzleDir, "meta", "_journal.json"), "utf8"),
  ) as { entries: JournalEntry[] };

  const sql = neon(url);
  // Same table and schema as `drizzle.config.ts`.
  const rows = (await sql`
    select hash from public.__drizzle_migrations
  `) as Array<{ hash: string }>;
  const applied = new Set(rows.map((r) => r.hash));

  const missing = entries.filter((entry) => {
    const file = readFileSync(join(drizzleDir, `${entry.tag}.sql`), "utf8");
    // Drizzle hashes the whole file as read, comments included.
    const hash = createHash("sha256").update(file).digest("hex");
    return !applied.has(hash);
  });

  if (missing.length > 0) {
    throw new Error(
      `${missing.length} journal ${missing.length === 1 ? "entry is" : "entries are"} not applied to this database:\n` +
        missing.map((e) => `  - ${e.tag} (when ${e.when})`).join("\n") +
        "\nA `when` older than an already-applied entry is skipped by the migrator; see src/db/migrations-journal.test.ts.",
    );
  }

  console.info(
    `[verify] all ${entries.length} journal entries are applied (${applied.size} rows in __drizzle_migrations)`,
  );
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
