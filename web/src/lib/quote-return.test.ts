import { beforeEach, describe, expect, it, vi } from "vitest";

import type Stripe from "stripe";

/**
 * A return from Stripe on a quote link that a later email retired while the
 * couple paid. The session stands in for the dead token, so every way a
 * session can fail to be *this* finished payment of a live quote must come
 * back `null` — the proxy then answers the dead link with its 404.
 */

const getPaymentBySessionId = vi.fn();
vi.mock("@/lib/quotes", () => ({
  getPaymentBySessionId: (...args: unknown[]) => getPaymentBySessionId(...args),
}));

const sessionsRetrieve = vi.fn();
let stripeConfigured = true;
vi.mock("@/lib/stripe", () => ({
  isStripeConfigured: () => stripeConfigured,
  onOwningAccount: (run: (options?: unknown) => unknown) => run({ stripeAccount: "acct_test" }),
  stripe: () => ({
    checkout: { sessions: { retrieve: (...args: unknown[]) => sessionsRetrieve(...args) } },
  }),
}));

const { resolveRetiredQuoteReturn, RETIRED_RETURN_HOURS } = await import("./quote-return");

const QUOTE_ID = "aaaaaaaa-1111-4111-8111-111111111111";
const BALANCE_ID = "dddddddd-4444-4444-8444-444444444444";
const SESSION_ID = "cs_test_paid_balance";
const NOW = new Date("2026-07-20T10:00:00Z");
/** Ten minutes before `NOW`, in Stripe's unix seconds. */
const CREATED = Math.floor(NOW.getTime() / 1000) - 10 * 60;

function found(status = "deposit_paid") {
  return { quote: { id: QUOTE_ID, status }, payment: { id: BALANCE_ID, kind: "balance" } };
}

function session(overrides: Partial<Stripe.Checkout.Session> = {}): Stripe.Checkout.Session {
  return {
    id: SESSION_ID,
    status: "complete",
    payment_status: "paid",
    created: CREATED,
    metadata: { quoteId: QUOTE_ID, paymentId: BALANCE_ID, kind: "balance" },
    ...overrides,
  } as Stripe.Checkout.Session;
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  stripeConfigured = true;
  getPaymentBySessionId.mockResolvedValue(found());
  sessionsRetrieve.mockResolvedValue(session());
});

describe("resolveRetiredQuoteReturn", () => {
  it("finds the quote behind a paid session of one of its instalments", async () => {
    expect(await resolveRetiredQuoteReturn(SESSION_ID, { now: NOW })).toBe(QUOTE_ID);
    expect(sessionsRetrieve).toHaveBeenCalledWith(SESSION_ID, undefined, {
      stripeAccount: "acct_test",
    });
  });

  it("finds it for a complete session that waits on a delayed method", async () => {
    sessionsRetrieve.mockResolvedValue(session({ payment_status: "unpaid" }));

    expect(await resolveRetiredQuoteReturn(SESSION_ID, { now: NOW })).toBe(QUOTE_ID);
  });

  it("refuses a session that is not one of our instalments, without asking Stripe", async () => {
    getPaymentBySessionId.mockResolvedValue(null);

    expect(await resolveRetiredQuoteReturn(SESSION_ID, { now: NOW })).toBeNull();
    expect(sessionsRetrieve).not.toHaveBeenCalled();
  });

  it("refuses a session of a quote that is no longer live", async () => {
    getPaymentBySessionId.mockResolvedValue(found("cancelled"));

    expect(await resolveRetiredQuoteReturn(SESSION_ID, { now: NOW })).toBeNull();
    expect(sessionsRetrieve).not.toHaveBeenCalled();
  });

  it("refuses a session that is still open", async () => {
    sessionsRetrieve.mockResolvedValue(session({ status: "open" }));

    expect(await resolveRetiredQuoteReturn(SESSION_ID, { now: NOW })).toBeNull();
  });

  it("refuses a session whose metadata names another quote or instalment", async () => {
    sessionsRetrieve.mockResolvedValueOnce(
      session({ metadata: { quoteId: "eeeeeeee-5555-4555-8555-555555555555", paymentId: BALANCE_ID } }),
    );
    expect(await resolveRetiredQuoteReturn(SESSION_ID, { now: NOW })).toBeNull();

    sessionsRetrieve.mockResolvedValueOnce(
      session({ metadata: { quoteId: QUOTE_ID, paymentId: "cccccccc-3333-4333-8333-333333333333" } }),
    );
    expect(await resolveRetiredQuoteReturn(SESSION_ID, { now: NOW })).toBeNull();
  });

  it(`refuses a session created more than ${RETIRED_RETURN_HOURS} hours ago`, async () => {
    const limit = Math.floor(NOW.getTime() / 1000) - RETIRED_RETURN_HOURS * 60 * 60;

    sessionsRetrieve.mockResolvedValueOnce(session({ created: limit }));
    expect(await resolveRetiredQuoteReturn(SESSION_ID, { now: NOW })).toBe(QUOTE_ID);

    sessionsRetrieve.mockResolvedValueOnce(session({ created: limit - 1 }));
    expect(await resolveRetiredQuoteReturn(SESSION_ID, { now: NOW })).toBeNull();
  });

  it("does not look up something that is not a session id", async () => {
    expect(await resolveRetiredQuoteReturn("<script>", { now: NOW })).toBeNull();
    expect(getPaymentBySessionId).not.toHaveBeenCalled();
  });

  it("does nothing while Stripe is not configured", async () => {
    stripeConfigured = false;

    expect(await resolveRetiredQuoteReturn(SESSION_ID, { now: NOW })).toBeNull();
    expect(getPaymentBySessionId).not.toHaveBeenCalled();
  });

  it("answers null when Stripe fails", async () => {
    sessionsRetrieve.mockRejectedValue(new Error("Stripe is down"));

    expect(await resolveRetiredQuoteReturn(SESSION_ID, { now: NOW })).toBeNull();
  });
});
