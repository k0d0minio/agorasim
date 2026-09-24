import { getTableName, type SQL } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { optOutAddressHash } from "./email-opt-out-token";

/**
 * The suppression list at its `@/db` boundary. The fake holds two tables —
 * `email_opt_outs` keyed by hash, and the enquiries with their consent — and
 * reads the parameters of each `where` through drizzle's own dialect, so a
 * query that asked about the wrong hash or updated the wrong enquiries fails
 * here rather than passing quietly.
 */

type Enquiry = {
  id: string;
  email: string | null;
  marketingConsent: boolean;
  marketingConsentAt: Date | null;
  marketingConsentVersion: string | null;
};

let optOuts = new Map<string, { via: string; createdAt: Date }>();
let enquiries: Enquiry[] = [];
let audits: Record<string, unknown>[] = [];

const dialect = new PgDialect();
const paramsOf = (condition: SQL) => dialect.sqlToQuery(condition).params;

type Table = Parameters<typeof getTableName>[0];

const fakeDb = {
  insert: (table: Table) => ({
    values: (row: { addressHash: string; via: string }) => ({
      onConflictDoNothing: () => ({
        returning: async () => {
          expect(getTableName(table)).toBe("email_opt_outs");
          if (optOuts.has(row.addressHash)) return [];
          optOuts.set(row.addressHash, { via: row.via, createdAt: new Date("2026-09-25T08:00:00Z") });
          return [{ addressHash: row.addressHash }];
        },
      }),
    }),
  }),
  select: () => ({
    from: (table: Table) => ({
      where: (condition: SQL) => {
        const name = getTableName(table);
        const run = () => {
          if (name === "email_opt_outs") {
            const [hash] = paramsOf(condition) as string[];
            const row = optOuts.get(hash);
            return row ? [{ addressHash: hash, createdAt: row.createdAt }] : [];
          }
          expect(name).toBe("tour_requests");
          expect(paramsOf(condition)).toEqual([true]);
          return enquiries
            .filter((enquiry) => enquiry.marketingConsent)
            .map(({ id, email }) => ({ id, email }));
        };
        const result = Promise.resolve().then(run);
        return Object.assign(result, { limit: async () => run() });
      },
    }),
  }),
  update: (table: Table) => ({
    set: (patch: Partial<Enquiry>) => ({
      where: async (condition: SQL) => {
        expect(getTableName(table)).toBe("tour_requests");
        const ids = paramsOf(condition) as string[];
        for (const enquiry of enquiries) {
          if (ids.includes(enquiry.id)) Object.assign(enquiry, patch);
        }
      },
    }),
  }),
};

vi.mock("@/db", async () => {
  const schema = await vi.importActual<typeof import("@/db/schema")>("@/db/schema");
  return { ...schema, db: fakeDb };
});

vi.mock("@/lib/audit", () => ({
  recordAuditOrWarn: async (entry: Record<string, unknown>) => {
    audits.push(entry);
  },
}));

const { isOptedOut, optedOutAt, recordOptOut } = await import("./email-opt-out");

function enquiry(id: string, email: string | null, consent: boolean): Enquiry {
  return {
    id,
    email,
    marketingConsent: consent,
    marketingConsentAt: consent ? new Date("2026-08-01T10:00:00Z") : null,
    marketingConsentVersion: consent ? "2026-07-30" : null,
  };
}

beforeEach(() => {
  optOuts = new Map();
  enquiries = [];
  audits = [];
});

describe("recordOptOut", () => {
  it("puts the address on the list, so every later check says so", async () => {
    const hash = await optOutAddressHash("marta@example.pt");

    expect(await isOptedOut("marta@example.pt")).toBe(false);
    const result = await recordOptOut(hash, "page");

    expect(result.recorded).toBe(true);
    expect(await isOptedOut("marta@example.pt")).toBe(true);
    // Any spelling of the same address — a later enquiry typed differently.
    expect(await isOptedOut(" MARTA@example.pt")).toBe(true);
    expect(await isOptedOut("joao@example.pt")).toBe(false);
    expect(optOuts.get(hash)?.via).toBe("page");
  });

  it("stores the hash, never the address", async () => {
    await recordOptOut(await optOutAddressHash("marta@example.pt"), "one-click");

    for (const key of optOuts.keys()) {
      expect(key).not.toContain("marta");
    }
  });

  it("withdraws marketing consent on every enquiry with the address, and only those", async () => {
    enquiries = [
      enquiry("e1", "marta@example.pt", true),
      enquiry("e2", "marta@example.pt", true),
      enquiry("e3", "joao@example.pt", true),
      enquiry("e4", null, true),
    ];

    const result = await recordOptOut(await optOutAddressHash("marta@example.pt"), "page");

    expect(result.consentWithdrawn).toBe(2);
    for (const id of ["e1", "e2"]) {
      expect(enquiries.find((row) => row.id === id)).toMatchObject({
        marketingConsent: false,
        marketingConsentAt: null,
        marketingConsentVersion: null,
      });
    }
    expect(enquiries.find((row) => row.id === "e3")?.marketingConsent).toBe(true);
    expect(enquiries.find((row) => row.id === "e4")?.marketingConsent).toBe(true);
  });

  it("is idempotent: a second press records nothing and audits nothing", async () => {
    enquiries = [enquiry("e1", "marta@example.pt", true)];
    const hash = await optOutAddressHash("marta@example.pt");

    await recordOptOut(hash, "page");
    const again = await recordOptOut(hash, "one-click");

    expect(again).toEqual({ recorded: false, consentWithdrawn: 0 });
    expect(optOuts.size).toBe(1);
    // The first path is the one kept.
    expect(optOuts.get(hash)?.via).toBe("page");
    expect(audits).toHaveLength(1);
  });

  it("audits the path and the counts, never the address or the hash", async () => {
    const hash = await optOutAddressHash("marta@example.pt");
    await recordOptOut(hash, "one-click");

    expect(audits[0]).toMatchObject({
      actorUserId: null,
      action: "email.opted_out",
      entityType: "email_opt_out",
      after: { via: "one-click", consentWithdrawn: 0 },
    });
    const serialised = JSON.stringify(audits[0]);
    expect(serialised).not.toContain("marta");
    expect(serialised).not.toContain(hash);
  });
});

describe("optedOutAt", () => {
  it("answers when for an opted-out address and null otherwise", async () => {
    await recordOptOut(await optOutAddressHash("marta@example.pt"), "page");

    expect(await optedOutAt("marta@example.pt")).toEqual(new Date("2026-09-25T08:00:00Z"));
    expect(await optedOutAt("joao@example.pt")).toBeNull();
  });
});
