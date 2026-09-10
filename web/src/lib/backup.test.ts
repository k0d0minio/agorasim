import { getTableName, is, Table } from "drizzle-orm";
import {
  boolean,
  date,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";

import * as schema from "@/db/schema";
import { verifyPassword } from "./password";
import {
  BACKUP_RETENTION_DAYS,
  BACKUP_TABLES,
  UNUSABLE_PASSWORD_HASH,
  backupColumns,
  backupDate,
  backupDateOf,
  backupPathname,
  decodeRow,
  encodeRow,
  findBackupTable,
  isExpired,
  manifestPathname,
  parseNdjson,
  primaryKeyColumn,
  restoreUpsertSet,
  toNdjson,
  type BackupTable,
} from "./backup";

/**
 * A table with one column of every kind the schema uses, so the round trip is
 * asserted per type rather than per business table. `secret` stands in for
 * `admin_users.password_hash`.
 */
const sample = pgTable("backup_sample", {
  id: uuid("id").primaryKey().defaultRandom(),
  at: timestamp("at", { withTimezone: true }).notNull(),
  maybeAt: timestamp("maybe_at", { withTimezone: true }),
  day: date("day").notNull(),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  count: integer("count").notNull(),
  flag: boolean("flag").notNull(),
  payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
  note: text("note"),
  secret: text("secret").notNull(),
});

const spec: BackupTable = { name: "backup_sample", table: sample, redact: ["secret"] };

const row = {
  id: "7d0e9f6a-1f2b-4c3d-8e9f-0a1b2c3d4e5f",
  at: new Date("2026-09-12T10:00:00.000Z"),
  maybeAt: null,
  day: "2026-09-12",
  amount: "1234.50",
  count: 3,
  flag: true,
  payload: {
    pt: "Passeio",
    // Looks like a timestamp; must come back as the string it is.
    when: "2026-09-12T10:00:00.000Z",
    nested: { n: 1, list: ["a", "b"] },
  },
  note: "2026-01-01T00:00:00.000Z",
  secret: "scrypt$32768$8$1$salt$hash",
};

describe("encodeRow / decodeRow", () => {
  it("round-trips every column type the schema uses", () => {
    const encoded = encodeRow(spec, row);
    const decoded = decodeRow(spec, JSON.parse(JSON.stringify(encoded)));

    expect(decoded.id).toBe(row.id);
    expect(decoded.at).toBeInstanceOf(Date);
    expect((decoded.at as Date).getTime()).toBe(row.at.getTime());
    expect(decoded.maybeAt).toBeNull();
    // `date` columns are strings in Drizzle on both sides — not revived.
    expect(decoded.day).toBe("2026-09-12");
    // Numerics are strings on both sides too; the cents survive exactly.
    expect(decoded.amount).toBe("1234.50");
    expect(decoded.count).toBe(3);
    expect(decoded.flag).toBe(true);
    expect(decoded.payload).toEqual(row.payload);
  });

  it("revives a timestamp by column type, never by what the value looks like", () => {
    const decoded = decodeRow(spec, encodeRow(spec, row));
    // A text column whose content is an ISO date stays text …
    expect(decoded.note).toBe("2026-01-01T00:00:00.000Z");
    // … and so does one inside a jsonb payload.
    expect((decoded.payload as Record<string, unknown>).when).toBe(
      "2026-09-12T10:00:00.000Z",
    );
  });

  it("writes timestamps as ISO-8601 strings", () => {
    expect(encodeRow(spec, row).at).toBe("2026-09-12T10:00:00.000Z");
  });

  it("never writes a redacted column, and never reads one back", () => {
    const encoded = encodeRow(spec, row);
    expect(encoded).not.toHaveProperty("secret");

    // Even a file that somehow carries the column does not restore it.
    const decoded = decodeRow(spec, { ...encoded, secret: "leaked" });
    expect(decoded).not.toHaveProperty("secret");
  });

  it("leaves a column out when the file does not have it, so its default applies", () => {
    const encoded = encodeRow(spec, row);
    delete encoded.note;
    const decoded = decodeRow(spec, encoded);
    expect(decoded).not.toHaveProperty("note");
    // A null is a value, not an absence — it is kept.
    expect(decoded).toHaveProperty("maybeAt", null);
  });

  it("ignores a column the current schema no longer has", () => {
    const decoded = decodeRow(spec, { ...encodeRow(spec, row), dropped: "x" });
    expect(decoded).not.toHaveProperty("dropped");
  });

  it("writes undefined as null rather than dropping the key", () => {
    const encoded = encodeRow(spec, { ...row, note: undefined });
    expect(encoded).toHaveProperty("note", null);
  });
});

describe("toNdjson / parseNdjson", () => {
  it("writes one newline-terminated JSON object per row and reads them back", () => {
    const rows = [row, { ...row, id: "00000000-0000-4000-8000-000000000001", count: 4 }];
    const text = toNdjson(spec, rows);

    expect(text.endsWith("\n")).toBe(true);
    expect(text.trimEnd().split("\n")).toHaveLength(2);

    const parsed = parseNdjson(spec, text);
    expect(parsed).toHaveLength(2);
    expect(parsed[1]!.count).toBe(4);
    expect((parsed[0]!.at as Date).getTime()).toBe(row.at.getTime());
  });

  it("is empty for no rows, and tolerates blank lines and a missing final newline", () => {
    expect(toNdjson(spec, [])).toBe("");
    expect(parseNdjson(spec, "")).toEqual([]);

    const line = JSON.stringify(encodeRow(spec, row));
    expect(parseNdjson(spec, `\n${line}\n\n${line}`)).toHaveLength(2);
  });
});

describe("restoreUpsertSet", () => {
  it("overwrites every backed-up column except the key and the redacted ones", () => {
    const set = restoreUpsertSet(spec);
    expect(Object.keys(set).sort()).toEqual(
      ["amount", "at", "count", "day", "flag", "maybeAt", "note", "payload"].sort(),
    );
  });
});

describe("BACKUP_TABLES", () => {
  it("covers every table the schema exports, so a new table cannot go unbacked-up", () => {
    const exported = Object.values(schema)
      .filter((value): value is Table => is(value, Table))
      .map((table) => getTableName(table))
      .sort();
    const registered = BACKUP_TABLES.map((t) => t.name).sort();
    expect(registered).toEqual(exported);
  });

  it("names each table by its Postgres name, once", () => {
    for (const t of BACKUP_TABLES) {
      expect(getTableName(t.table)).toBe(t.name);
    }
    expect(new Set(BACKUP_TABLES.map((t) => t.name)).size).toBe(BACKUP_TABLES.length);
  });

  it("has exactly one primary-key column per table, for the upsert target", () => {
    for (const t of BACKUP_TABLES) {
      expect(primaryKeyColumn(t).primary).toBe(true);
    }
  });

  it("redacts only columns that exist, and always the operators' password digests", () => {
    for (const t of BACKUP_TABLES) {
      const all = Object.keys(backupColumns({ ...t, redact: [] }));
      for (const key of t.redact) expect(all).toContain(key);
    }
    const admins = findBackupTable("admin_users")!;
    expect(admins.redact).toContain("passwordHash");
    expect(Object.keys(backupColumns(admins))).not.toContain("passwordHash");
  });

  it("lists every table after the tables it references", () => {
    const order = BACKUP_TABLES.map((t) => t.name);
    const before = (a: string, b: string) =>
      expect(order.indexOf(a)).toBeLessThan(order.indexOf(b));
    before("admin_users", "audit_log");
    before("admin_users", "quotes");
    before("admin_users", "feature_requests");
    before("tour_requests", "bookings");
    before("tour_requests", "quotes");
    before("tour_requests", "message_log");
    before("bookings", "message_log");
    before("quotes", "quote_payments");
  });
});

describe("UNUSABLE_PASSWORD_HASH", () => {
  it("is rejected for every candidate, including itself", async () => {
    expect(await verifyPassword("", UNUSABLE_PASSWORD_HASH)).toBe(false);
    expect(await verifyPassword("password", UNUSABLE_PASSWORD_HASH)).toBe(false);
    expect(await verifyPassword(UNUSABLE_PASSWORD_HASH, UNUSABLE_PASSWORD_HASH)).toBe(false);
  });
});

describe("pathnames and retention", () => {
  it("places a day's files under backups/YYYY-MM-DD/", () => {
    expect(backupDate(new Date("2026-09-12T02:30:00Z"))).toBe("2026-09-12");
    expect(backupPathname("2026-09-12", "bookings")).toBe(
      "backups/2026-09-12/bookings.ndjson.gz",
    );
    expect(manifestPathname("2026-09-12")).toBe("backups/2026-09-12/manifest.json");
    expect(backupDateOf("backups/2026-09-12/bookings.ndjson.gz")).toBe("2026-09-12");
    expect(backupDateOf("experiences/photo.jpg")).toBeNull();
    expect(backupDateOf("backups/latest/bookings.ndjson.gz")).toBeNull();
  });

  it("expires a day strictly older than the retention window", () => {
    const now = new Date("2026-10-12T02:30:00Z");
    expect(BACKUP_RETENTION_DAYS).toBe(30);
    expect(isExpired("backups/2026-09-12/bookings.ndjson.gz", now)).toBe(false); // 30 days
    expect(isExpired("backups/2026-09-11/bookings.ndjson.gz", now)).toBe(true); // 31 days
    expect(isExpired("backups/2026-10-12/manifest.json", now)).toBe(false);
  });

  it("never expires an object it cannot date", () => {
    const now = new Date("2030-01-01T00:00:00Z");
    expect(isExpired("experiences/photo.jpg", now)).toBe(false);
    expect(isExpired("backups/notes.txt", now)).toBe(false);
  });
});
