import { getTableName } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The Art. 15 export, at the `@/db` boundary.
 *
 * What is worth holding here is the **registry**, not the SQL: the module's own
 * note says answering "everything you hold about me" correctly means
 * enumerating every table that references the person, and the failure mode is
 * silent — a table that is missing produces an export that looks complete. So
 * these tests assert which tables were read and that every row read comes back
 * in the file, rather than re-testing drizzle.
 *
 * `quotes` and `quote_payments` are the ones this suite was written for: a
 * couple's venue and the lines Rita typed were held and were not exported.
 */

type QueryCall = { method: string; args: unknown[] };

let calls: QueryCall[] = [];
let results: unknown[] = [];
/** The tables `db.select()` was pointed at, in order. */
let tablesRead: string[] = [];

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
          return (
            onFulfilled?: (value: unknown) => unknown,
            onRejected?: (reason: unknown) => unknown,
          ) => Promise.resolve(value).then(onFulfilled, onRejected);
        }
        return (...args: unknown[]) => {
          calls.push({ method: String(prop), args });
          // `from` is the only place the registry is observable: which tables
          // an export reads is the property under test.
          if (prop === "from") {
            tablesRead.push(getTableName(args[0] as Parameters<typeof getTableName>[0]));
          }
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

const { exportSubjectData, subjectExportFilename } = await import("./subject-data");

const LEAD_ID = "bbbbbbbb-2222-4222-8222-222222222222";
const QUOTE_ID = "aaaaaaaa-1111-4111-8111-111111111111";

beforeEach(() => {
  calls = [];
  results = [];
  tablesRead = [];
});

/** One enquiry, one send, one quote and its two instalments. */
function queueFullSubject(): void {
  queueResult([{ id: LEAD_ID, email: "marta@example.pt", name: "Marta Nunes" }]);
  queueResult([{ id: "msg-1", tourRequestId: LEAD_ID, kind: "enquiry-ack" }]);
  queueResult([
    {
      id: QUOTE_ID,
      tourRequestId: LEAD_ID,
      venue: "Quinta do Hespanhol, Mafra",
      lineItems: [{ label: "4 carros clássicos", unitCents: 45_000, quantity: 4 }],
      totalCents: 192_000,
    },
  ]);
  queueResult([
    { id: "pay-1", quoteId: QUOTE_ID, kind: "deposit", amountCents: 57_600 },
    { id: "pay-2", quoteId: QUOTE_ID, kind: "balance", amountCents: 134_400 },
  ]);
}

describe("exportSubjectData", () => {
  it("reads every table in the registry, and no others", async () => {
    queueFullSubject();

    await exportSubjectData("Marta@Example.PT");

    expect(tablesRead).toEqual([
      "tour_requests",
      "message_log",
      "quotes",
      "quote_payments",
    ]);
  });

  it("puts the couple's quote in the file — venue, lines and all", async () => {
    queueFullSubject();

    const data = await exportSubjectData("marta@example.pt");

    expect(data.records.quotes).toHaveLength(1);
    expect(data.records.quotes[0]).toMatchObject({
      venue: "Quinta do Hespanhol, Mafra",
      lineItems: [{ label: "4 carros clássicos", unitCents: 45_000, quantity: 4 }],
    });
    expect(data.records.quotePayments).toHaveLength(2);
    expect(data.counts).toEqual({
      tourRequests: 1,
      messageLog: 1,
      quotes: 1,
      quotePayments: 2,
    });
  });

  it("normalizes the address it was asked about", async () => {
    queueFullSubject();

    const data = await exportSubjectData("  Marta@Example.PT ");

    expect(data.subjectEmail).toBe("marta@example.pt");
  });

  it("asks nothing further about a person with no enquiry", async () => {
    // `inArray` on an empty list is a SQL error in some drivers and a full scan
    // in others, and the answer is known either way.
    queueResult([]);

    const data = await exportSubjectData("nobody@example.pt");

    expect(tablesRead).toEqual(["tour_requests"]);
    expect(data.records.quotes).toEqual([]);
    expect(data.records.quotePayments).toEqual([]);
    expect(data.counts).toEqual({
      tourRequests: 0,
      messageLog: 0,
      quotes: 0,
      quotePayments: 0,
    });
  });

  it("skips the instalment query for an enquiry that was never quoted", async () => {
    queueResult([{ id: LEAD_ID, email: "marta@example.pt" }]);
    queueResult([]); // no sends
    queueResult([]); // no quotes

    const data = await exportSubjectData("marta@example.pt");

    expect(tablesRead).toEqual(["tour_requests", "message_log", "quotes"]);
    expect(data.records.quotePayments).toEqual([]);
  });
});

describe("subjectExportFilename", () => {
  it("is a name an operator can hand over without renaming it", () => {
    expect(
      subjectExportFilename("Marta@Example.PT", new Date("2026-09-18T09:00:00Z")),
    ).toBe("agorasim-data-export-marta-example-pt-2026-09-18.json");
  });
});
