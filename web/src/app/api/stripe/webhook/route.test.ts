import { beforeEach, describe, expect, it, vi } from "vitest";

import type Stripe from "stripe";

/**
 * The refund half of the webhook: what a refund issued in the Stripe dashboard
 * does to a booking.
 *
 * Exercised through the real route handler, in the shape `app/admin/actions.test.ts`
 * uses for the refund it issues from the other direction — a fake Neon client and
 * a whole stand-in for `lib/stripe`, with the real schema underneath so
 * `eq()`/`or()` build genuine SQL against genuine columns. What is asserted is
 * what a row would actually contain, and which calls Stripe would actually get.
 *
 * Four properties, and they are the ones the ticket is about:
 *
 * 1. **A dashboard refund lands.** Amounts written, `refunded` on a full one,
 *    and with it the seat — capacity counts `confirmed` rows, so the status
 *    write *is* the release (`lib/bookings.ts`).
 * 2. **A partial refund is not a cancellation.** Money recorded, status left
 *    `confirmed`, car still committed, because the guest is still coming.
 * 3. **Idempotent.** Stripe retries for three days; a redelivered event finds
 *    the numbers it would have written and touches nothing.
 * 4. **The commission comes back in proportion**, topped up to what §6 requires
 *    from whatever the dashboard left it at — and a failure to return it never
 *    costs the row its record of the guest's money.
 */

// ---------------------------------------------------------------------------
// A fake Neon client: chainable, and resolving to whatever the test queued.
// ---------------------------------------------------------------------------

type QueryCall = { method: string; args: unknown[] };

let calls: QueryCall[] = [];
let results: unknown[] = [];

function queueResult(value: unknown): void {
  results.push(value);
}

function nextResult(): unknown {
  return results.length > 0 ? results.shift() : [];
}

function makeQuery(): unknown {
  const proxy: unknown = new Proxy(
    {},
    {
      get(_target, prop) {
        if (prop === "then") {
          const value = nextResult();
          return (
            onFulfilled?: (value: unknown) => unknown,
            onRejected?: (reason: unknown) => unknown,
          ) =>
            value instanceof Error
              ? Promise.reject(value).then(onFulfilled, onRejected)
              : Promise.resolve(value).then(onFulfilled, onRejected);
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

// ---------------------------------------------------------------------------
// Stripe, whole. Whether Stripe's own API works is not this suite's question;
// what it asks is which calls the route makes and what it does with the answers.
// ---------------------------------------------------------------------------

const constructEventAsync = vi.fn();
const chargesRetrieve = vi.fn();
const refundsList = vi.fn();
const applicationFeesRetrieve = vi.fn();
const applicationFeesCreateRefund = vi.fn();

// No connected account, as on the deployment today: `onOwningAccount` is a
// straight pass-through and every event arrives with no `account` on it.
vi.mock("@/lib/stripe", () => ({
  isStripeConfigured: () => true,
  isWebhookConfigured: () => true,
  isTestMode: () => true,
  connectedAccountId: () => null,
  isConnectConfigured: () => false,
  onConnectedAccount: (options?: unknown) => options,
  onOwningAccount: (run: (options?: unknown) => unknown) => run(undefined),
  stripe: () => ({
    webhooks: { constructEventAsync: (...args: unknown[]) => constructEventAsync(...args) },
    charges: { retrieve: (...args: unknown[]) => chargesRetrieve(...args) },
    refunds: { list: (...args: unknown[]) => refundsList(...args) },
    applicationFees: {
      retrieve: (...args: unknown[]) => applicationFeesRetrieve(...args),
      createRefund: (...args: unknown[]) => applicationFeesCreateRefund(...args),
    },
  }),
}));

// Neither is reached on a refund; both are imported by the module under test.
vi.mock("@/lib/email", () => ({
  isEmailConfigured: () => false,
  sendEmail: vi.fn(),
  teamRecipients: () => [],
  senderAddress: () => null,
}));
vi.mock("@/lib/request-ip", () => ({ clientIp: async () => "203.0.113.9" }));

// The alarm the route pulls on the cases it cannot fix. A stand-in, so the
// suite can see it pulled without a DSN or a transport in the way.
vi.mock("@/lib/observability", () => ({ captureAlert: vi.fn(), captureError: vi.fn() }));

const { POST } = await import("./route");
const { captureAlert, captureError } = await import("@/lib/observability");
const { proportionalFeeRefundCents } = await import("@/lib/booking-refund");

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const BOOKING_ID = "3f8a1b6c-0d4e-4a2f-9c11-7e5b2d9a0c33";

/** A confirmed €340 booking whose charge carried the agreement's 4% (§4). */
function bookingRow(overrides: Record<string, unknown> = {}) {
  return {
    id: BOOKING_ID,
    date: "2026-09-19",
    status: "confirmed",
    amountCents: 34_000,
    currency: "eur",
    refundedAmountCents: 0,
    refundedFeeCents: 0,
    stripePaymentIntentId: "pi_test_1",
    stripeChargeId: "ch_test_1",
    applicationFeeCents: 1_360,
    ...overrides,
  };
}

function chargeObject(overrides: Partial<Stripe.Charge> = {}) {
  return {
    id: "ch_test_1",
    object: "charge",
    amount: 34_000,
    amount_refunded: 34_000,
    refunded: true,
    payment_intent: "pi_test_1",
    application_fee: "fee_test_1",
    application_fee_amount: 1_360,
    refunds: { data: [{ id: "re_test_1" }] },
    ...overrides,
  } as unknown as Stripe.Charge;
}

/** A request the route will accept, with an event queued behind the signature. */
async function post(event: Record<string, unknown>): Promise<Response> {
  constructEventAsync.mockResolvedValueOnce(event);
  return POST(
    new Request("https://agorasim.pt/api/stripe/webhook", {
      method: "POST",
      headers: { "stripe-signature": "t=1,v1=whatever-the-mock-accepts" },
      body: JSON.stringify(event),
    }),
  );
}

/** Every `.set({…})` the handler passed to an UPDATE, in order. */
function updateSets(): Record<string, unknown>[] {
  return calls
    .filter((call) => call.method === "set")
    .map((call) => call.args[0] as Record<string, unknown>);
}

/** The values of the one audit INSERT, if there was one. */
function auditValues(): Record<string, unknown> | undefined {
  return calls.find((call) => call.method === "values")?.args[0] as
    | Record<string, unknown>
    | undefined;
}

beforeEach(() => {
  calls = [];
  results = [];
  vi.clearAllMocks();
  // The route logs the cases it cannot fix; the suite provokes several of them.
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "info").mockImplementation(() => {});
  process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
});

// ---------------------------------------------------------------------------

describe("proportionalFeeRefundCents", () => {
  it("returns the whole fee for a whole refund, exactly", () => {
    expect(
      proportionalFeeRefundCents({
        feeCents: 1_360,
        chargeCents: 34_000,
        refundedCents: 34_000,
      }),
    ).toBe(1_360);
  });

  it("returns the fee in proportion to a partial refund", () => {
    expect(
      proportionalFeeRefundCents({
        feeCents: 1_360,
        chargeCents: 34_000,
        refundedCents: 17_000,
      }),
    ).toBe(680);
  });

  it("rounds to the nearest cent rather than shaving it", () => {
    // A third of €13.60 is €4.5333…, which is €4.53 and not €4.53-and-a-bit.
    expect(
      proportionalFeeRefundCents({
        feeCents: 1_360,
        chargeCents: 30_000,
        refundedCents: 10_000,
      }),
    ).toBe(453);
  });

  it("returns nothing when there was no fee, and nothing on a nil refund", () => {
    expect(
      proportionalFeeRefundCents({ feeCents: 0, chargeCents: 34_000, refundedCents: 34_000 }),
    ).toBe(0);
    expect(
      proportionalFeeRefundCents({ feeCents: 1_360, chargeCents: 34_000, refundedCents: 0 }),
    ).toBe(0);
  });
});

describe("POST /api/stripe/webhook — charge.refunded", () => {
  it("refunds the booking, frees the seat and returns the commission", async () => {
    const existing = bookingRow();
    queueResult([existing]);
    queueResult([{ ...existing, status: "refunded", refundedAmountCents: 34_000 }]);
    queueResult([
      { ...existing, status: "refunded", refundedAmountCents: 34_000, refundedFeeCents: 1_360 },
    ]);
    applicationFeesRetrieve.mockResolvedValueOnce({ id: "fee_test_1", amount_refunded: 0 });
    applicationFeesCreateRefund.mockResolvedValueOnce({ id: "fr_test_1" });

    const response = await post({
      id: "evt_1",
      type: "charge.refunded",
      account: null,
      data: { object: chargeObject() },
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ received: true, outcome: "synced" });

    const [claim, settle] = updateSets();
    // `refunded` is the seat release: capacity counts `confirmed` rows only.
    expect(claim).toMatchObject({
      status: "refunded",
      refundedAmountCents: 34_000,
      stripeRefundId: "re_test_1",
    });
    expect(claim.refundedAt).toBeInstanceOf(Date);
    expect(settle).toMatchObject({ refundedFeeCents: 1_360 });

    // The whole fee, because the whole charge went back — and on the platform,
    // which is where an application fee lives.
    expect(applicationFeesCreateRefund).toHaveBeenCalledWith(
      "fee_test_1",
      { amount: 1_360 },
      { idempotencyKey: `booking-fee-refund:${BOOKING_ID}:1360` },
    );

    expect(auditValues()).toMatchObject({
      action: "booking.refunded",
      entityId: BOOKING_ID,
      after: expect.objectContaining({
        status: "refunded",
        via: "stripe",
        amountCents: 34_000,
        refundedAmountCents: 34_000,
        applicationFeeCents: 1_360,
        refundedFeeCents: 1_360,
        stripeRefundId: "re_test_1",
      }),
    });
  });

  it("records a partial refund without calling the tour off", async () => {
    const existing = bookingRow();
    queueResult([existing]);
    queueResult([{ ...existing, refundedAmountCents: 17_000 }]);
    queueResult([{ ...existing, refundedAmountCents: 17_000, refundedFeeCents: 680 }]);
    applicationFeesRetrieve.mockResolvedValueOnce({ id: "fee_test_1", amount_refunded: 0 });
    applicationFeesCreateRefund.mockResolvedValueOnce({ id: "fr_test_2" });

    const response = await post({
      id: "evt_2",
      type: "charge.refunded",
      account: null,
      data: { object: chargeObject({ amount_refunded: 17_000, refunded: false }) },
    });

    await expect(response.json()).resolves.toEqual({ received: true, outcome: "synced" });

    const [claim] = updateSets();
    // The guest is still coming, so the car stays committed and the status with it.
    expect(claim).toMatchObject({ status: "confirmed", refundedAmountCents: 17_000 });
    expect(applicationFeesCreateRefund).toHaveBeenCalledWith(
      "fee_test_1",
      { amount: 680 },
      expect.objectContaining({ idempotencyKey: `booking-fee-refund:${BOOKING_ID}:680` }),
    );
  });

  it("does nothing at all when the row already says what Stripe is saying", async () => {
    // The redelivery, and equally the event our own admin refund caused.
    queueResult([
      bookingRow({ status: "refunded", refundedAmountCents: 34_000, refundedFeeCents: 1_360 }),
    ]);

    const response = await post({
      id: "evt_3",
      type: "charge.refunded",
      account: null,
      data: { object: chargeObject() },
    });

    await expect(response.json()).resolves.toEqual({
      received: true,
      outcome: "already-synced",
    });
    expect(calls.some((call) => call.method === "update")).toBe(false);
    expect(calls.some((call) => call.method === "insert")).toBe(false);
    expect(applicationFeesRetrieve).not.toHaveBeenCalled();
  });

  it("tops the fee up only by what the dashboard left behind", async () => {
    // `cancelAndRefundBooking` already asked for the fee back with
    // `refund_application_fee`, then refunded the rest by hand: Stripe has
    // returned €6.80 of €13.60 and the proportion now due is all of it.
    const existing = bookingRow({ refundedAmountCents: 17_000, refundedFeeCents: 680 });
    queueResult([existing]);
    queueResult([{ ...existing, status: "refunded", refundedAmountCents: 34_000 }]);
    queueResult([
      { ...existing, status: "refunded", refundedAmountCents: 34_000, refundedFeeCents: 1_360 },
    ]);
    applicationFeesRetrieve.mockResolvedValueOnce({ id: "fee_test_1", amount_refunded: 680 });
    applicationFeesCreateRefund.mockResolvedValueOnce({ id: "fr_test_3" });

    await post({
      id: "evt_4",
      type: "charge.refunded",
      account: null,
      data: { object: chargeObject() },
    });

    expect(applicationFeesCreateRefund).toHaveBeenCalledWith(
      "fee_test_1",
      { amount: 680 },
      expect.objectContaining({ idempotencyKey: `booking-fee-refund:${BOOKING_ID}:1360` }),
    );
  });

  it("keeps the guest's money recorded when the fee refund fails", async () => {
    const existing = bookingRow();
    queueResult([existing]);
    queueResult([{ ...existing, status: "refunded", refundedAmountCents: 34_000 }]);
    applicationFeesRetrieve.mockRejectedValueOnce(new Error("Stripe is having a day"));

    const response = await post({
      id: "evt_5",
      type: "charge.refunded",
      account: null,
      data: { object: chargeObject() },
    });

    // 200 and `synced`: the row is right about the guest's money, which is the
    // half that must not be rolled back, and a retry would not fix the fee.
    await expect(response.json()).resolves.toEqual({ received: true, outcome: "synced" });
    expect(updateSets()).toHaveLength(1);
    expect(auditValues()).toMatchObject({
      after: expect.objectContaining({ refundedAmountCents: 34_000, refundedFeeCents: 0 }),
    });
  });

  it("asks Stripe for the refund id when the payload carries none", async () => {
    const existing = bookingRow({ applicationFeeCents: null });
    queueResult([existing]);
    queueResult([{ ...existing, status: "refunded", refundedAmountCents: 34_000 }]);
    refundsList.mockResolvedValueOnce({ data: [{ id: "re_looked_up" }] });

    await post({
      id: "evt_6",
      type: "charge.refunded",
      account: null,
      data: {
        object: chargeObject({
          refunds: undefined,
          application_fee: null,
          application_fee_amount: null,
        }),
      },
    });

    expect(refundsList).toHaveBeenCalledWith({ charge: "ch_test_1", limit: 1 }, undefined);
    expect(updateSets()[0]).toMatchObject({ stripeRefundId: "re_looked_up" });
    // No fee was ever taken, so there is none to return.
    expect(applicationFeesRetrieve).not.toHaveBeenCalled();
  });

  it("acknowledges a refund on a charge no booking was paid with", async () => {
    queueResult([]);

    const response = await post({
      id: "evt_7",
      type: "charge.refunded",
      account: null,
      data: { object: chargeObject() },
    });

    // 200, loudly: retrying will not conjure the row.
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      received: true,
      outcome: "unknown-charge",
    });
    // "Loudly" means a person hears about it, not only the log: money moved on
    // a charge this app never sold, and that is the alarm's whole purpose.
    expect(captureAlert).toHaveBeenCalledWith(
      expect.stringContaining("no booking"),
      expect.objectContaining({
        area: "stripe-webhook",
        tags: expect.objectContaining({ outcome: "unknown-charge" }),
        extra: expect.objectContaining({ chargeId: "ch_test_1" }),
      }),
    );
    expect(captureError).not.toHaveBeenCalled();
  });

  it("ignores a refund from an account that is not this deployment's", async () => {
    const response = await post({
      id: "evt_8",
      type: "charge.refunded",
      account: "acct_somebody_else",
      data: { object: chargeObject() },
    });

    await expect(response.json()).resolves.toEqual({
      received: true,
      ignored: "foreign account",
    });
    expect(calls).toHaveLength(0);
    // Dropped, but not quietly: an endpoint receiving another account's
    // payments is mis-wired, and only a person can find out whose.
    expect(captureAlert).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        level: "warning",
        tags: expect.objectContaining({ outcome: "foreign-account" }),
        extra: expect.objectContaining({ account: "acct_somebody_else" }),
      }),
    );
  });
});

describe("POST /api/stripe/webhook — refund.updated", () => {
  it("re-reads the charge and reconciles from it", async () => {
    const existing = bookingRow();
    queueResult([existing]);
    queueResult([{ ...existing, status: "refunded", refundedAmountCents: 34_000 }]);
    queueResult([
      { ...existing, status: "refunded", refundedAmountCents: 34_000, refundedFeeCents: 1_360 },
    ]);
    chargesRetrieve.mockResolvedValueOnce(chargeObject());
    applicationFeesRetrieve.mockResolvedValueOnce({ id: "fee_test_1", amount_refunded: 0 });
    applicationFeesCreateRefund.mockResolvedValueOnce({ id: "fr_test_4" });

    const response = await post({
      id: "evt_9",
      type: "refund.updated",
      account: null,
      data: {
        object: { id: "re_settled", object: "refund", charge: "ch_test_1", status: "succeeded" },
      },
    });

    await expect(response.json()).resolves.toEqual({ received: true, outcome: "synced" });
    expect(chargesRetrieve).toHaveBeenCalledWith(
      "ch_test_1",
      { expand: ["refunds"] },
      undefined,
    );
    // The event named the refund, so nothing had to go looking for it.
    expect(updateSets()[0]).toMatchObject({ stripeRefundId: "re_settled" });
    expect(refundsList).not.toHaveBeenCalled();
  });

  it("follows a failed refund back down without un-refunding the booking", async () => {
    // The money never left: `amount_refunded` is 0 again. The amounts follow it,
    // the status does not — the car may already have been resold.
    const existing = bookingRow({ status: "refunded", refundedAmountCents: 34_000 });
    queueResult([existing]);
    queueResult([{ ...existing, refundedAmountCents: 0 }]);
    chargesRetrieve.mockResolvedValueOnce(
      chargeObject({ amount_refunded: 0, refunded: false }),
    );

    await post({
      id: "evt_10",
      type: "refund.updated",
      account: null,
      data: {
        object: { id: "re_failed", object: "refund", charge: "ch_test_1", status: "failed" },
      },
    });

    const [claim] = updateSets();
    expect(claim).toMatchObject({ status: "refunded", refundedAmountCents: 0 });
    // Nothing is refunded any more, so nothing stamps a refund time.
    expect(claim.refundedAt).toBeUndefined();
  });

  it("acknowledges a refund whose charge cannot be read", async () => {
    chargesRetrieve.mockRejectedValueOnce(new Error("no such charge"));

    const response = await post({
      id: "evt_11",
      type: "refund.updated",
      account: null,
      data: { object: { id: "re_orphan", object: "refund", charge: "ch_gone" } },
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ received: true, ignored: "no charge" });
    expect(calls).toHaveLength(0);
  });
});

describe("POST /api/stripe/webhook — the endpoint's own guarantees", () => {
  it("refuses a payload whose signature does not verify", async () => {
    constructEventAsync.mockRejectedValueOnce(new Error("no signatures found"));

    const response = await POST(
      new Request("https://agorasim.pt/api/stripe/webhook", {
        method: "POST",
        headers: { "stripe-signature": "t=1,v1=forged" },
        body: JSON.stringify({ type: "charge.refunded" }),
      }),
    );

    // 400, not 500: asking Stripe to retry a payload that cannot be verified
    // would repeat the failure for three days.
    expect(response.status).toBe(400);
    expect(calls).toHaveLength(0);
  });

  it("refuses an unsigned request outright", async () => {
    const response = await POST(
      new Request("https://agorasim.pt/api/stripe/webhook", { method: "POST", body: "{}" }),
    );

    expect(response.status).toBe(400);
    expect(constructEventAsync).not.toHaveBeenCalled();
  });

  it("asks Stripe to try again when the database is the thing that failed", async () => {
    queueResult(new Error("neon: connection reset"));

    const response = await post({
      id: "evt_12",
      type: "charge.refunded",
      account: null,
      data: { object: chargeObject() },
    });

    // The one case a retry genuinely fixes.
    expect(response.status).toBe(500);
  });
});
