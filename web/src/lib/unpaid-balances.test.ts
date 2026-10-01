import { beforeEach, describe, expect, it, vi } from "vitest";

import type { SQL } from "drizzle-orm";

/**
 * "Saldo por pagar" — `listUnpaidBalancesDue` through the real function, with
 * only the Neon client faked.
 *
 * Past balances nobody recorded or wrote off stay on the panel for good, so
 * under one shared 50-row cap enough of them would push the events due in the
 * next three days — the ones the panel exists for — off the end. The fix is
 * structural: the upcoming and the past rows are two reads with a cap each,
 * plus a count of the past ones. These tests pin that shape: what each read
 * asks the database for (the split at today, the order, the cap, the one
 * eligibility rule all three share) and what comes back to the board.
 *
 * The harness is the one `quote-writes.test.ts` uses: a chainable proxy that
 * records every call and resolves, in order, to whatever the test queued, with
 * the real schema behind it so the SQL is genuinely built. It applies no
 * `LIMIT`, so the "database" here returns what Postgres would under each cap.
 */

type QueryCall = { method: string; args: unknown[] };

let calls: QueryCall[] = [];
let results: unknown[] = [];

function queueResult(value: unknown): void {
  results.push(value);
}

function makeQuery(): unknown {
  const proxy: unknown = new Proxy(
    {},
    {
      get(_target, prop) {
        if (prop === "then") {
          const value = results.length > 0 ? results.shift() : [];
          return (onFulfilled?: (value: unknown) => unknown) =>
            Promise.resolve(value).then(onFulfilled);
        }
        return (...args: unknown[]) => {
          calls.push({ method: String(prop), args });
          return proxy;
        };
      },
    },
  );
  return proxy;
}

const fakeDb = new Proxy(
  {},
  {
    get(_target, prop) {
      return (...args: unknown[]) => {
        calls.push({ method: String(prop), args });
        return makeQuery();
      };
    },
  },
);

vi.mock("@/db", async () => {
  const schema = await vi.importActual<typeof import("@/db/schema")>("@/db/schema");
  return { ...schema, db: fakeDb };
});

const { listUnpaidBalancesDue } = await import("./quotes");
const { PgDialect } = await import("drizzle-orm/pg-core");

/** The n-th call of `method`'s first argument, rendered as Postgres would get it. */
function renderedArg(method: string, n: number): { sql: string; params: unknown[] } {
  const arg = calls.filter((call) => call.method === method)[n]?.args[0];
  return new PgDialect().sqlToQuery(arg as SQL);
}

/** 09:00 in Lisbon on 1 October 2026 — today is 2026-10-01, T−3 is 2026-10-04. */
const NOW = new Date("2026-10-01T08:00:00Z");
const TODAY = "2026-10-01";
const HORIZON = "2026-10-04";

/** A row as the select shapes it — only what the board reads off it matters here. */
function row(id: string, eventDate: string) {
  return {
    quote: { id, eventDate, status: "deposit_paid" },
    payment: { quoteId: id, kind: "balance", status: "pending", amountCents: 120000 },
    leadName: `Lead ${id}`,
  };
}

/** `count` past rows, the most recent first, from the day before `TODAY` backwards. */
function pastRows(count: number) {
  return Array.from({ length: count }, (_, i) => {
    const day = new Date(Date.UTC(2026, 8, 30 - i)).toISOString().slice(0, 10);
    return row(`past-${i}`, day);
  });
}

beforeEach(() => {
  calls = [];
  results = [];
});

describe("listUnpaidBalancesDue", () => {
  it("keeps every soon-due balance when more than 50 past ones are unresolved", async () => {
    const upcoming = [row("today", TODAY), row("t-1", "2026-10-02"), row("t-3", HORIZON)];
    const past = pastRows(50);
    // 55 past balances are open; the past read stops at its cap of 50.
    queueResult(upcoming);
    queueResult(past);
    queueResult([{ n: 55 }]);

    const due = await listUnpaidBalancesDue({ now: NOW });

    expect(due.upcoming.map(({ quote }) => quote.id)).toEqual(["today", "t-1", "t-3"]);
    expect(due.past).toHaveLength(50);
    expect(due.past[0]?.quote.eventDate).toBe("2026-09-30");
    expect(due.pastTotal).toBe(55);
  });

  it("reads the upcoming and the past rows apart, each under its own cap", async () => {
    await listUnpaidBalancesDue({ now: NOW });

    // Two row reads and one count — never one read whose cap both halves share.
    expect(calls.filter((call) => call.method === "select")).toHaveLength(3);
    expect(calls.filter((call) => call.method === "limit").map((call) => call.args[0])).toEqual([
      50, 50,
    ]);
  });

  it("splits at today: upcoming is today to T−3, soonest first", async () => {
    await listUnpaidBalancesDue({ now: NOW });

    const where = renderedArg("where", 0);
    expect(where.sql).toContain('"quotes"."event_date" >=');
    expect(where.sql).toContain('"quotes"."event_date" <=');
    expect(where.params).toEqual(expect.arrayContaining([TODAY, HORIZON]));
    expect(renderedArg("orderBy", 0).sql).toBe('"quotes"."event_date" asc');
  });

  it("splits at today: past is before today, most recent first, and counted", async () => {
    await listUnpaidBalancesDue({ now: NOW });

    for (const n of [1, 2]) {
      const where = renderedArg("where", n);
      expect(where.sql).toContain('"quotes"."event_date" <');
      expect(where.sql).not.toContain('"quotes"."event_date" >=');
      expect(where.params).toContain(TODAY);
      expect(where.params).not.toContain(HORIZON);
    }
    expect(renderedArg("orderBy", 1).sql).toBe('"quotes"."event_date" desc');
  });

  it("applies the one rule isBalanceFlagged states to all three reads", async () => {
    await listUnpaidBalancesDue({ now: NOW });

    for (const n of [0, 1, 2]) {
      const { sql, params } = renderedArg("where", n);
      expect(sql).toContain('"quotes"."status" =');
      expect(sql).toContain('"quote_payments"."kind" =');
      expect(sql).toContain('"quote_payments"."status" in');
      expect(sql).toContain('"quote_payments"."amount_cents" >');
      expect(params).toEqual(
        expect.arrayContaining(["deposit_paid", "balance", "pending", "issued", 0]),
      );
      expect(params).not.toContain("paid");
      expect(params).not.toContain("cancelled");
    }
  });

  it("reads a count the driver returns as text as a number", async () => {
    queueResult([]);
    queueResult(pastRows(50));
    queueResult([{ n: "61" }]);

    const due = await listUnpaidBalancesDue({ now: NOW });

    expect(due.pastTotal).toBe(61);
  });

  it("comes back empty when nothing is open", async () => {
    const due = await listUnpaidBalancesDue({ now: NOW });

    expect(due).toEqual({ upcoming: [], past: [], pastTotal: 0 });
  });
});
