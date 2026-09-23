import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Quote, QuotePayment } from "@/db";

/**
 * The quote writes that move something other than the quote — through the real
 * functions, with only the Neon client faked.
 *
 * Three rules are asserted here rather than in `quotes.test.ts`, because all
 * three are database writes rather than arithmetic and each one is a way the
 * shipped schema would have failed on the first real wedding:
 *
 * 1. A deposit settled by **bank transfer** is written off rather than paid, and
 *    used to leave the quote at `sent` — the one status `listQuotesDueForBalance`
 *    filters out. The couple paid and their balance was never asked for.
 * 2. A couple who paid stayed at "Contactado" on Rita's board, which is also
 *    what kept them inside the retention sweep: `lib/retention.ts` exempts the
 *    `booked` stage, so a stage that never moved was an event record shredded
 *    two years after the money arrived.
 * 3. Writing an instalment off is the team's bookkeeping, not the couple's act,
 *    so it must not stamp `accepted_at` — evidence of an agreement nobody made.
 *
 * The harness is the one `admin/calendar/manual-booking.test.ts` uses: a
 * chainable proxy that records every call and resolves to whatever the test
 * queued, with the real schema behind it so the SQL is genuinely built.
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
          return (
            onFulfilled?: (value: unknown) => unknown,
            onRejected?: (reason: unknown) => unknown,
          ) => Promise.resolve(value).then(onFulfilled, onRejected);
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

vi.mock("@/lib/request-ip", () => ({ clientIp: async () => "203.0.113.9" }));

const {
  cancelPayment,
  copyQuoteAsDraft,
  discardDraft,
  markPaymentPaid,
  markQuoteSent,
  quoteRef,
  supersedeSentQuotes,
} = await import("./quotes");
const { PgDialect } = await import("drizzle-orm/pg-core");

/** The `WHERE` of the n-th `.where()` call, rendered as Postgres would get it. */
function whereSql(n = 0): { sql: string; params: unknown[] } {
  const clause = calls.filter((call) => call.method === "where")[n]?.args[0];
  return new PgDialect().sqlToQuery(clause as Parameters<PgDialect["sqlToQuery"]>[0]);
}

const QUOTE_ID = "aaaaaaaa-1111-4111-8111-111111111111";
const LEAD_ID = "bbbbbbbb-2222-4222-8222-222222222222";
const DEPOSIT_ID = "cccccccc-3333-4333-8333-333333333333";
const BALANCE_ID = "dddddddd-4444-4444-8444-444444444444";
const OPERATOR_ID = "eeeeeeee-5555-4555-8555-555555555555";
const NOW = new Date("2026-06-01T10:00:00Z");

/** A sent quote for a wedding in August, with a lead behind it. */
function quote(overrides: Partial<Quote> = {}): Record<string, unknown> {
  return {
    id: QUOTE_ID,
    tourRequestId: LEAD_ID,
    createdByUserId: null,
    eventDate: "2026-08-15",
    venue: "Quinta do Hespanhol, Mafra",
    locale: "pt",
    lineItems: [],
    totalCents: 192_000,
    currency: "eur",
    depositPercent: 30,
    termsWindowDays: 30,
    termsVersion: "2026-09-01",
    acceptedTermsVersion: null,
    acceptedAt: null,
    status: "sent",
    accessTokenHash: null,
    sentAt: new Date("2026-05-01T10:00:00Z"),
    cancelledAt: null,
    createdAt: new Date("2026-05-01T10:00:00Z"),
    updatedAt: new Date("2026-05-01T10:00:00Z"),
    ...overrides,
  };
}

function instalment(
  id: string,
  kind: QuotePayment["kind"],
  status: QuotePayment["status"],
): Record<string, unknown> {
  return {
    id,
    quoteId: QUOTE_ID,
    kind,
    status,
    amountCents: kind === "deposit" ? 57_600 : 134_400,
    currency: "eur",
    dueDate: kind === "balance" ? "2026-08-01" : null,
    stripeSessionId: null,
    stripePaymentIntentId: null,
    stripeChargeId: null,
    stripeConnectedAccountId: null,
    applicationFeeCents: null,
    commissionRateBps: null,
    refundedAmountCents: 0,
    refundedFeeCents: 0,
    stripeRefundId: null,
    issuedAt: null,
    paidAt: null,
    refundedAt: null,
    createdAt: new Date(kind === "deposit" ? "2026-05-01T10:00:00Z" : "2026-05-01T10:00:01Z"),
    updatedAt: new Date("2026-05-01T10:00:00Z"),
  };
}

/**
 * The reads `syncQuoteAfterPaymentChange` makes after an instalment moves: the
 * quote, then its instalments, then the lead the stage move lands on.
 */
function queueSyncAfter(
  depositStatus: QuotePayment["status"],
  options: { leadStatus?: string | null; quoteOverrides?: Partial<Quote> } = {},
): void {
  const { leadStatus = "contacted", quoteOverrides = {} } = options;
  queueResult([quote(quoteOverrides)]);
  queueResult([
    instalment(DEPOSIT_ID, "deposit", depositStatus),
    instalment(BALANCE_ID, "balance", "pending"),
  ]);
  // The quote's own status write.
  queueResult([quote({ ...quoteOverrides, status: "deposit_paid" } as Partial<Quote>)]);
  // The lead's stage write — empty when there is nowhere forward to go.
  queueResult(leadStatus === null ? [] : [{ id: LEAD_ID, status: "booked" }]);
}

/** The `set()` payloads handed to `db.update(...)`, in order. */
function updatedValues(): Record<string, unknown>[] {
  return calls
    .filter((call) => call.method === "set")
    .map((call) => call.args[0] as Record<string, unknown>);
}

/** The audit rows written this test — the inserts carrying an `action`. */
function auditRows(): Record<string, unknown>[] {
  return calls
    .filter((call) => call.method === "values")
    .map((call) => call.args[0] as Record<string, unknown>)
    .filter((values) => typeof values.action === "string");
}

beforeEach(() => {
  calls = [];
  results = [];
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("cancelPayment — the bank-transfer deposit", () => {
  it("puts the quote in deposit_paid, so the T−14 job can see it at all", async () => {
    queueResult([instalment(DEPOSIT_ID, "deposit", "cancelled")]);
    queueSyncAfter("cancelled");

    const payment = await cancelPayment(DEPOSIT_ID, NOW);

    expect(payment?.id).toBe(DEPOSIT_ID);
    // Two writes against the quote's own status: the instalment, then the quote.
    expect(updatedValues()[0]).toMatchObject({ status: "cancelled" });
    expect(updatedValues()[1]).toMatchObject({ status: "deposit_paid" });
  });

  it("moves the couple to the booked stage, which is what keeps their record", async () => {
    queueResult([instalment(DEPOSIT_ID, "deposit", "cancelled")]);
    queueSyncAfter("cancelled");

    await cancelPayment(DEPOSIT_ID, NOW);

    expect(updatedValues()[2]).toMatchObject({ status: "booked" });
    expect(auditRows()[0]).toMatchObject({
      // A write-off is recorded by the team but reaches this module without an
      // operator; the lead's Histórico renders that as the system.
      actorUserId: null,
      action: "tour_request.status_changed",
      entityType: "tour_request",
      entityId: LEAD_ID,
      after: { status: "booked", quoteRef: quoteRef(QUOTE_ID), source: "quote" },
      ipAddress: null,
    });
  });

  it("does not stamp acceptance — the couple agreed to nothing here", async () => {
    queueResult([instalment(DEPOSIT_ID, "deposit", "cancelled")]);
    queueSyncAfter("cancelled");

    await cancelPayment(DEPOSIT_ID, NOW);

    expect(updatedValues()[1]).not.toHaveProperty("acceptedAt");
    expect(updatedValues()[1]).not.toHaveProperty("acceptedTermsVersion");
  });

  it("changes nothing when the instalment was already settled", async () => {
    // A second write-off finds no row in a cancellable state.
    queueResult([]);

    expect(await cancelPayment(DEPOSIT_ID, NOW)).toBeNull();
    // Only the instalment write was attempted; no quote and no lead followed.
    expect(updatedValues()).toHaveLength(1);
    expect(auditRows()).toEqual([]);
  });
});

describe("markPaymentPaid — the deposit through Stripe", () => {
  it("books the lead and stamps the terms the couple accepted", async () => {
    queueResult([instalment(DEPOSIT_ID, "deposit", "paid")]);
    queueSyncAfter("paid");

    await markPaymentPaid(DEPOSIT_ID, {}, NOW);

    expect(updatedValues()[1]).toMatchObject({
      status: "deposit_paid",
      acceptedAt: NOW,
      acceptedTermsVersion: "2026-09-01",
    });
    expect(updatedValues()[2]).toMatchObject({ status: "booked" });
    expect(auditRows()[0]).toMatchObject({ entityId: LEAD_ID, actorUserId: null });
  });

  it("records no stage move for a quote raised without an enquiry", async () => {
    queueResult([instalment(DEPOSIT_ID, "deposit", "paid")]);
    queueSyncAfter("paid", { quoteOverrides: { tourRequestId: null } });

    await markPaymentPaid(DEPOSIT_ID, {}, NOW);

    expect(updatedValues().some((values) => values.status === "booked")).toBe(false);
    expect(auditRows()).toEqual([]);
  });

  it("stays idempotent: a repeat webhook delivery moves nothing", async () => {
    queueResult([]);

    expect(await markPaymentPaid(DEPOSIT_ID, {}, NOW)).toBeNull();
    expect(updatedValues()).toHaveLength(1);
    expect(auditRows()).toEqual([]);
  });
});

describe("markQuoteSent", () => {
  it("moves the lead to the quoted stage and says who sent it", async () => {
    queueResult([quote()]);
    queueResult([{ id: LEAD_ID, status: "quoted" }]);

    const sent = await markQuoteSent(QUOTE_ID, {
      termsVersion: "2026-09-01",
      actorUserId: OPERATOR_ID,
      now: NOW,
    });

    expect(sent?.id).toBe(QUOTE_ID);
    expect(updatedValues()[1]).toMatchObject({ status: "quoted" });
    expect(auditRows()[0]).toMatchObject({
      actorUserId: OPERATOR_ID,
      action: "tour_request.status_changed",
      entityId: LEAD_ID,
      after: { status: "quoted", quoteRef: quoteRef(QUOTE_ID), source: "quote" },
      // An operator's send carries the request's IP, unlike the webhook's.
      ipAddress: "203.0.113.9",
    });
  });

  it("records no move when the lead is already past the quoted stage", async () => {
    queueResult([quote()]);
    // The guard is in the WHERE clause, so a lead at `booked` or in the archive
    // simply is not among the rows the update may land on.
    queueResult([]);

    await markQuoteSent(QUOTE_ID, { termsVersion: "2026-09-01", now: NOW });

    expect(auditRows()).toEqual([]);
  });

  it("does not touch the lead when the quote could not be sent", async () => {
    queueResult([]);

    expect(
      await markQuoteSent(QUOTE_ID, { termsVersion: "2026-09-01", now: NOW }),
    ).toBeNull();
    expect(updatedValues()).toHaveLength(1);
  });
});

/**
 * The guards the quote builder rests on (`lib/quote-builder.ts`), asserted in
 * the SQL itself: two phones and a double tap are answered by the `WHERE`
 * clause, not by a read that came first.
 */
describe("markQuoteSent — the builder's guards", () => {
  it("lands on a draft only when asked to send a draft", async () => {
    queueResult([quote()]);
    queueResult([]);

    await markQuoteSent(QUOTE_ID, { termsVersion: "2026-09-10", from: ["draft"], now: NOW });

    const { sql, params } = whereSql();
    expect(sql).toContain('"quotes"."status" in');
    expect(params).toContain("draft");
    // Without the narrowing, `sent → sent` would let a second tap rotate the
    // link and mail the couple twice.
    expect(params).not.toContain("sent");
  });

  it("pins a re-send to the send the operator saw", async () => {
    const seen = new Date("2026-05-20T09:00:00Z");
    queueResult([quote()]);
    queueResult([]);

    await markQuoteSent(QUOTE_ID, {
      termsVersion: "2026-09-10",
      from: ["sent"],
      ifSentAt: seen,
      now: NOW,
    });

    const { sql, params } = whereSql();
    expect(sql).toContain('"quotes"."sent_at" =');
    expect(params).toContain("sent");
    expect(params).not.toContain("draft");
  });

  it("writes nothing when asked to send from a status that cannot be sent", async () => {
    expect(
      await markQuoteSent(QUOTE_ID, { termsVersion: "2026-09-10", from: ["paid"], now: NOW }),
    ).toBeNull();
    expect(calls).toEqual([]);
  });
});

describe("supersedeSentQuotes — a new version replaces the old", () => {
  const OLD_ID = "ffffffff-6666-4666-8666-666666666666";

  it("cancels the lead's other sent quotes, and says which replaced which", async () => {
    queueResult([quote({ id: OLD_ID, status: "cancelled" } as Partial<Quote>)]);

    const superseded = await supersedeSentQuotes(
      { id: QUOTE_ID, tourRequestId: LEAD_ID },
      { actorUserId: OPERATOR_ID, now: NOW },
    );

    expect(superseded).toHaveLength(1);
    expect(updatedValues()[0]).toMatchObject({ status: "cancelled", cancelledAt: NOW });

    const { sql, params } = whereSql();
    expect(sql).toContain('"quotes"."tour_request_id" =');
    expect(sql).toContain('"quotes"."id" <>');
    expect(params).toEqual(expect.arrayContaining([LEAD_ID, QUOTE_ID, "sent"]));
    // Money is never superseded — only `sent` is touched.
    expect(params).not.toContain("deposit_paid");

    expect(auditRows()[0]).toMatchObject({
      actorUserId: OPERATOR_ID,
      action: "quote.superseded",
      entityType: "tour_request",
      entityId: LEAD_ID,
      after: { quoteRef: quoteRef(OLD_ID), status: "cancelled", replacedBy: quoteRef(QUOTE_ID) },
    });
  });

  it("does nothing for a quote with no lead behind it", async () => {
    expect(await supersedeSentQuotes({ id: QUOTE_ID, tourRequestId: null })).toEqual([]);
    expect(calls).toEqual([]);
  });
});

describe("discardDraft", () => {
  it("cancels a draft, and nothing else", async () => {
    queueResult([quote({ status: "cancelled" } as Partial<Quote>)]);

    expect(await discardDraft(QUOTE_ID, NOW)).not.toBeNull();

    const { params } = whereSql();
    expect(params).toContain("draft");
    expect(params).not.toContain("sent");
  });
});

describe("copyQuoteAsDraft", () => {
  it("refuses to copy a quote that is not sent", async () => {
    queueResult([quote({ status: "deposit_paid" } as Partial<Quote>)]);
    queueResult([]);

    expect(await copyQuoteAsDraft(QUOTE_ID, OPERATOR_ID)).toBeNull();
    expect(calls.some((call) => call.method === "insert")).toBe(false);
  });

  it("copies the offer but not the send — no link, no terms stamp", async () => {
    queueResult([quote({ lineItems: [{ label: "Carro", unitCents: 192_000, quantity: 1 }] } as Partial<Quote>)]);
    queueResult([instalment(DEPOSIT_ID, "deposit", "pending"), instalment(BALANCE_ID, "balance", "pending")]);
    queueResult([quote({ id: "ffffffff-6666-4666-8666-666666666666", status: "draft" } as Partial<Quote>)]);
    queueResult([]);

    await copyQuoteAsDraft(QUOTE_ID, OPERATOR_ID);

    const inserted = calls.find((call) => call.method === "values")?.args[0] as Record<
      string,
      unknown
    >;
    expect(inserted).toMatchObject({
      tourRequestId: LEAD_ID,
      createdByUserId: OPERATOR_ID,
      eventDate: "2026-08-15",
      venue: "Quinta do Hespanhol, Mafra",
      totalCents: 192_000,
      depositPercent: 30,
    });
    expect(inserted).not.toHaveProperty("accessTokenHash");
    expect(inserted).not.toHaveProperty("termsVersion");
    expect(inserted).not.toHaveProperty("status");
  });
});
