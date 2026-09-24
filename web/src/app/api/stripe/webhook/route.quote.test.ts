import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The webhook's quote branch — where a paid wedding or event instalment goes,
 * and, as importantly, where it does not.
 *
 * Before the quote page existed, every paid session went to
 * `confirmPaidBooking`, and a deposit would have come back `unknown-session`
 * and pulled the "matches no booking" alarm over perfectly good money. So what
 * is asserted here is routing: a quote session reaches `recordQuotePayment`
 * and never the booking path; a tour session reaches the booking path exactly
 * as before; an expired quote session touches no booking at all. What the
 * recording then does is `lib/quote-checkout.test.ts`'s subject.
 */

const constructEventAsync = vi.fn();
const chargesRetrieve = vi.fn();

vi.mock("@/lib/stripe", () => ({
  isStripeConfigured: () => true,
  isWebhookConfigured: () => true,
  connectedAccountId: () => null,
  onOwningAccount: (run: (options?: unknown) => unknown) => run(undefined),
  stripe: () => ({
    webhooks: { constructEventAsync: (...args: unknown[]) => constructEventAsync(...args) },
    charges: { retrieve: (...args: unknown[]) => chargesRetrieve(...args) },
  }),
}));

const confirmPaidBooking = vi.fn();
const closeUnpaidBooking = vi.fn();
vi.mock("@/lib/booking-checkout", () => ({
  confirmPaidBooking: (...args: unknown[]) => confirmPaidBooking(...args),
  closeUnpaidBooking: (...args: unknown[]) => closeUnpaidBooking(...args),
}));
const syncRefundFromStripe = vi.fn();
vi.mock("@/lib/booking-refund", () => ({
  syncRefundFromStripe: (...args: unknown[]) => syncRefundFromStripe(...args),
}));
const syncQuotePaymentRefundFromStripe = vi.fn();
vi.mock("@/lib/quote-refund", () => ({
  syncQuotePaymentRefundFromStripe: (...args: unknown[]) =>
    syncQuotePaymentRefundFromStripe(...args),
}));
vi.mock("@/lib/experience-catalogue", () => ({ listCatalogue: async () => [] }));
vi.mock("@/lib/observability", () => ({ captureAlert: vi.fn(), captureError: vi.fn() }));

const recordQuotePayment = vi.fn();
const alertUnknownQuoteSession = vi.fn();
vi.mock("@/lib/quote-checkout", () => ({
  // The real rule in miniature: a quote session is one labelled with a quote.
  quoteSessionMetadata: (session: { metadata?: Record<string, string> | null }) =>
    session.metadata?.quoteId ? { ...session.metadata } : null,
  recordQuotePayment: (...args: unknown[]) => recordQuotePayment(...args),
  alertUnknownQuoteSession: (...args: unknown[]) => alertUnknownQuoteSession(...args),
}));

const { POST } = await import("./route");
const { captureAlert } = await import("@/lib/observability");

const QUOTE_METADATA = {
  quoteId: "aaaaaaaa-1111-4111-8111-111111111111",
  paymentId: "cccccccc-3333-4333-8333-333333333333",
  kind: "deposit",
  ref: "QT-AAAAAA",
  termsVersion: "2026-09-24",
};

function sessionEvent(
  type: string,
  object: Record<string, unknown>,
): Record<string, unknown> {
  return { id: "evt_test", type, account: null, data: { object } };
}

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

beforeEach(() => {
  vi.resetAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "info").mockImplementation(() => {});
  process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
});

describe("POST /api/stripe/webhook — a paid quote session", () => {
  it("records the instalment and never reaches the booking path", async () => {
    recordQuotePayment.mockResolvedValue({ status: "recorded", quote: {} });

    const response = await post(
      sessionEvent("checkout.session.completed", {
        id: "cs_test_quote",
        payment_status: "paid",
        metadata: QUOTE_METADATA,
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ received: true, outcome: "recorded" });
    expect(recordQuotePayment).toHaveBeenCalledTimes(1);
    expect(confirmPaidBooking).not.toHaveBeenCalled();
    expect(captureAlert).not.toHaveBeenCalled();
  });

  it("treats a redelivery as success, not as an alarm", async () => {
    recordQuotePayment.mockResolvedValue({ status: "already", quote: null });

    const response = await post(
      sessionEvent("checkout.session.async_payment_succeeded", {
        id: "cs_test_quote",
        payment_status: "paid",
        metadata: QUOTE_METADATA,
      }),
    );

    expect(await response.json()).toEqual({ received: true, outcome: "already" });
    expect(alertUnknownQuoteSession).not.toHaveBeenCalled();
  });

  it("pulls the quote alarm, not the booking one, for money with no instalment", async () => {
    recordQuotePayment.mockResolvedValue({ status: "unknown" });

    await post(
      sessionEvent("checkout.session.completed", {
        id: "cs_test_orphan",
        payment_status: "paid",
        metadata: QUOTE_METADATA,
      }),
    );

    expect(alertUnknownQuoteSession).toHaveBeenCalledWith(
      "cs_test_orphan",
      "checkout.session.completed",
    );
    expect(captureAlert).not.toHaveBeenCalled();
  });

  it("waits, like a tour, while a delayed method has not paid yet", async () => {
    const response = await post(
      sessionEvent("checkout.session.completed", {
        id: "cs_test_multibanco",
        payment_status: "unpaid",
        metadata: QUOTE_METADATA,
      }),
    );

    expect(await response.json()).toEqual({ received: true, pending: true });
    expect(recordQuotePayment).not.toHaveBeenCalled();
  });
});

describe("POST /api/stripe/webhook — an expired or failed quote session", () => {
  it("touches no booking: the next tap on the quote page mints another", async () => {
    for (const type of ["checkout.session.expired", "checkout.session.async_payment_failed"]) {
      const response = await post(
        sessionEvent(type, { id: "cs_test_lapsed", metadata: QUOTE_METADATA }),
      );
      expect(await response.json()).toEqual({ received: true, quote: true });
    }
    expect(closeUnpaidBooking).not.toHaveBeenCalled();
  });
});

describe("POST /api/stripe/webhook — a tour session, unchanged", () => {
  it("still confirms the booking", async () => {
    confirmPaidBooking.mockResolvedValue({ status: "confirmed", booking: {} });

    await post(
      sessionEvent("checkout.session.completed", {
        id: "cs_test_tour",
        payment_status: "paid",
        payment_intent: "pi_test_tour",
        metadata: { bookingId: "3f8a1b6c-0d4e-4a2f-9c11-7e5b2d9a0c33" },
      }),
    );

    expect(confirmPaidBooking).toHaveBeenCalledWith(
      expect.objectContaining({ sessionId: "cs_test_tour", paymentIntentId: "pi_test_tour" }),
    );
    expect(recordQuotePayment).not.toHaveBeenCalled();
  });

  it("still closes an expired booking", async () => {
    await post(
      sessionEvent("checkout.session.expired", {
        id: "cs_test_tour",
        metadata: { bookingId: "3f8a1b6c-0d4e-4a2f-9c11-7e5b2d9a0c33" },
      }),
    );

    expect(closeUnpaidBooking).toHaveBeenCalledWith({
      sessionId: "cs_test_tour",
      status: "expired",
    });
  });
});

describe("POST /api/stripe/webhook — a refund on a quote instalment", () => {
  const charge = {
    id: "ch_test_quote",
    object: "charge",
    amount: 60_000,
    amount_refunded: 60_000,
    refunded: true,
    payment_intent: "pi_test_quote",
    application_fee: "fee_test_quote",
    application_fee_amount: 3_600,
    refunds: { data: [{ id: "re_test_quote" }] },
  };

  it("is tried against the instalments once no booking matches, and alarms nobody", async () => {
    syncRefundFromStripe.mockResolvedValue({ status: "unknown-charge" });
    syncQuotePaymentRefundFromStripe.mockResolvedValue({ status: "synced", payment: {} });

    const response = await post(sessionEvent("charge.refunded", charge));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ received: true, outcome: "synced", quote: true });
    expect(syncQuotePaymentRefundFromStripe).toHaveBeenCalledWith({
      charge: expect.objectContaining({ id: "ch_test_quote" }),
      refundId: null,
    });
    expect(captureAlert).not.toHaveBeenCalled();
  });

  it("passes the refund id a refund.updated event carries", async () => {
    syncRefundFromStripe.mockResolvedValue({ status: "unknown-charge" });
    syncQuotePaymentRefundFromStripe.mockResolvedValue({ status: "already-synced", payment: {} });
    // `refund.updated` carries the refund only; the route re-reads its charge.
    chargesRetrieve.mockResolvedValue(charge);

    const response = await post(
      sessionEvent("refund.updated", { id: "re_test_quote", object: "refund", charge: charge.id }),
    );

    expect(await response.json()).toEqual({
      received: true,
      outcome: "already-synced",
      quote: true,
    });
    expect(syncQuotePaymentRefundFromStripe).toHaveBeenCalledWith(
      expect.objectContaining({ refundId: "re_test_quote" }),
    );
  });

  it("never reaches the instalments when a booking matched", async () => {
    syncRefundFromStripe.mockResolvedValue({ status: "synced", booking: {} });

    const response = await post(sessionEvent("charge.refunded", charge));

    expect(await response.json()).toEqual({ received: true, outcome: "synced" });
    expect(syncQuotePaymentRefundFromStripe).not.toHaveBeenCalled();
  });

  it("still alarms on a refund that matches neither a booking nor an instalment", async () => {
    syncRefundFromStripe.mockResolvedValue({ status: "unknown-charge" });
    syncQuotePaymentRefundFromStripe.mockResolvedValue({ status: "unknown-charge" });

    const response = await post(sessionEvent("charge.refunded", charge));

    expect(await response.json()).toEqual({ received: true, outcome: "unknown-charge" });
    expect(captureAlert).toHaveBeenCalledWith(
      expect.stringContaining("no booking or quote instalment"),
      expect.objectContaining({
        tags: expect.objectContaining({ outcome: "unknown-charge" }),
        extra: { chargeId: "ch_test_quote" },
      }),
    );
  });
});
