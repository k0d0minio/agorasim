import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * Drizzle's migrator decides what to apply from one number: it reads the
 * newest `created_at` in `__drizzle_migrations` and applies every journal
 * entry whose `when` is greater. It never looks at which files it has seen.
 *
 * So a migration whose `when` is lower than an already-applied one is skipped
 * silently and forever, and the workflow still reports success. That is
 * exactly what happened to 0016 and 0017: both branches were cut before 0015
 * merged, both carried `when` values older than 0015's, and production ran
 * for days with `bookings.refunded_amount_cents` missing while the code
 * inserted it — every checkout failed with a 42703. Applied by hand on
 * 2026-09-05; this test is what should have refused the merge.
 *
 * `drizzle-kit generate` stamps `when` from the clock on the branch, so two
 * PRs in flight can each be valid alone and wrong together. A rebased or
 * renumbered migration must have its `when` moved past the entry before it.
 */
const drizzleDir = fileURLToPath(new URL("../../drizzle/", import.meta.url));

type JournalEntry = { idx: number; when: number; tag: string };

const journal = JSON.parse(
  readFileSync(join(drizzleDir, "meta", "_journal.json"), "utf8"),
) as { entries: JournalEntry[] };

describe("drizzle migration journal", () => {
  it("has strictly increasing `when` stamps, so no entry can be skipped", () => {
    const outOfOrder = journal.entries.filter(
      (entry, i) => i > 0 && entry.when <= journal.entries[i - 1].when,
    );
    expect(
      outOfOrder.map((e) => `${e.tag} (${e.when})`),
      "an entry stamped earlier than its predecessor is never applied to a database that already has the predecessor",
    ).toEqual([]);
  });

  it("numbers entries consecutively from 0", () => {
    expect(journal.entries.map((e) => e.idx)).toEqual(
      journal.entries.map((_, i) => i),
    );
  });

  it("names a file for every entry, prefixed by its index", () => {
    for (const entry of journal.entries) {
      expect(entry.tag.startsWith(String(entry.idx).padStart(4, "0") + "_")).toBe(
        true,
      );
      expect(existsSync(join(drizzleDir, `${entry.tag}.sql`))).toBe(true);
    }
  });
});
