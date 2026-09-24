import { beforeEach, describe, expect, it, vi } from "vitest";

import type Stripe from "stripe";

import type { QuotePayment } from "@/db";

/**
 * Money going back on a wedding or event instalment, through both doors: the
 * quote card's "Reembolsar" ({@link refundQuotePayment}) and a refund made in
 * the Stripe dashboard ({@link syncQuotePaymentRefundFromStripe}).
 *
 * The quote module is a small in-memory store here — the real pure rules
 * (`instalmentStatusAfterRefund`, the ceiling, `depositRefundedInFull`) over a
 * `recordPaymentRefund` that keeps its compare-and-set — so the two doors can
 * be run one after the other against the same rows, which is how the admin
 * refund and its webhook echo actually meet. Stripe is a stand-in whole.
 *
 * What is asserted is what the spec promises: the fee returned in proportion
 * and topped up to Stripe's cent, one Stripe refund per submission, refusals
 * that write nothing, a refused refund that cancels nothing, a partial refund
 * that is not a cancellation, and one notice to the couple per refund.
 */

// ---------------------------------------------------------------------------
// The lead lookup is the only raw query the module makes.
// ---------------------------------------------------------------------------

let leadRows: unknown[] = [];

function makeQuery(): unknown {
  const proxy: unknown = new Proxy(
    {},
    {
      get(_target, prop) {
        if (prop === "then") {
          return (onFulfilled?: (value: unknown) => unknown) =>
            Promise.resolve(leadRows).then(onFulfilled);
        }
        return () => proxy;
      },
    },
  );
  return proxy;
}

vi.mock("@/db", async () => {
  const schema = await vi.importActual<typeof import("@/db/schema")>("@/db/schema");
  return { ...schema, db: new Proxy({}, { get: () => () => makeQuery() }) };
});

// ---------------------------------------------------------------------------
// The quote module: the real rules over an in-memory store.
// ---------------------------------------------------------------------------

const QUOTE_ID = "aaaaaaaa-1111-4111-8111-111111111111";
const LEAD_ID = "bbbbbbbb-2222-4222-8222-222222222222";
const DEPOSIT_ID = "cccccccc-3333-4333-8333-333333333333";
const BALANCE_ID = "dddddddd-4444-4444-8444-444444444444";
const ADMIN_ID = "eeeeeeee-5555-4555-8555-555555555555";

let payments = new Map<string, QuotePayment>();
let quoteStatus = "deposit_paid";

const recordPaymentRefund = vi.fn();
const recordPaymentRefundFee = vi.fn();
const cancelQuoteAndOpenInstalments = vi.fn();

vi.mock("@/lib/quotes", async () => {
  const actual = await vi.importActual<typeof import("@/lib/quotes")>("@/lib/quotes");
  return {
    ...actual,
    getPayment: async (id: string) => {
      const payment = payments.get(id);
      return payment ? { quote: quoteRow(), payment } : null;
    },
    getPaymentByCharge: async (chargeId: string, intentId: string | null) => {
      const payment = [...payments.values()].find(
        (row) => row.stripeChargeId === chargeId || row.stripePaymentIntentId === intentId,
      );
      return payment ? { quote: quoteRow(), payment } : null;
    },
    getQuote: async () => ({ ...quoteRow(), payments: [...payments.values()] }),
    recordPaymentRefund: (...args: unknown[]) => recordPaymentRefund(...args),
    recordPaymentRefundFee: (...args: unknown[]) => recordPaymentRefundFee(...args),
    cancelQuoteAndOpenInstalments: (...args: unknown[]) =>
      cancelQuoteAndOpenInstalments(...args),
  };
});

// ---------------------------------------------------------------------------
// Stripe, whole, on a connected account.
// ---------------------------------------------------------------------------

const intentsRetrieve = vi.fn();
const refundsCreate = vi.fn();
const refundsList = vi.fn();
const feesRetrieve = vi.fn();
const feesCreateRefund = vi.fn();
let stripeConfigured = true;

vi.mock("@/lib/stripe", () => ({
  isStripeConfigured: () => stripeConfigured,
  onOwningAccount: (run: (options?: unknown) => unknown) =>
    run({ stripeAccount: "acct_test_agorasim" }),
  stripe: () => ({
    paymentIntents: { retrieve: (...args: unknown[]) => intentsRetrieve(...args) },
    refunds: {
      create: (...args: unknown[]) => refundsCreate(...args),
      list: (...args: unknown[]) => refundsList(...args),
    },
    applicationFees: {
      retrieve: (...args: unknown[]) => feesRetrieve(...args),
      createRefund: (...args: unknown[]) => feesCreateRefund(...args),
    },
  }),
}));

const sendLoggedEmail = vi.fn();
vi.mock("@/lib/message-log", () => ({
  sendLoggedEmail: (...args: unknown[]) => sendLoggedEmail(...args),
}));
vi.mock("@/lib/email", () => ({
  isEmailConfigured: () => true,
  teamRecipients: () => [],
  sendEmail: vi.fn(),
}));
const recordAuditOrWarn = vi.fn();
vi.mock("@/lib/audit", () => ({
  recordAuditOrWarn: (...args: unknown[]) => recordAuditOrWarn(...args),
}));
vi.mock("@/lib/observability", () => ({ captureAlert: vi.fn(), captureError: vi.fn() }));

const { refundQuotePayment, syncQuotePaymentRefundFromStripe, cancelHeldQuote } =
  await import("./quote-refund");
const { instalmentStatusAfterRefund } =
  await vi.importActual<typeof import("@/lib/quotes")>("@/lib/quotes");

// ---------------------------------------------------------------------------
// Fixtures — a €1 920 wedding: a €576 deposit paid with its 6% (€34.56), and
// a €1 344 balance still owed.
// ---------------------------------------------------------------------------

const DEPOSIT_FEE = 3_456;

function instalment(
  kind: "deposit" | "balance",
  status: QuotePayment["status"],
  overrides: Partial<QuotePayment> = {},
): QuotePayment {
  const paid = status === "paid" || status === "refunded";
  return {
    id: kind === "deposit" ? DEPOSIT_ID : BALANCE_ID,
    quoteId: QUOTE_ID,
    kind,
    status,
    amountCents: kind === "deposit" ? 57_600 : 134_400,
    currency: "eur",
    dueDate: kind === "balance" ? "2026-08-01" : null,
    stripeSessionId: null,
    stripePaymentIntentId: paid ? `pi_${kind}` : null,
    stripeChargeId: paid ? `ch_${kind}` : null,
    stripeConnectedAccountId: paid ? "acct_test_agorasim" : null,
    applicationFeeCents: paid ? DEPOSIT_FEE : null,
    commissionRateBps: paid ? 600 : null,
    refundedAmountCents: 0,
    refundedFeeCents: 0,
    stripeRefundId: null,
    issuedAt: null,
    paidAt: paid ? new Date("2026-05-02T10:00:00Z") : null,
    refundedAt: null,
    createdAt: new Date("2026-05-01T10:00:00Z"),
    updatedAt: new Date("2026-05-01T10:00:00Z"),
    ...overrides,
  } as QuotePayment;
}

function quoteRow(): Record<string, unknown> {
  return {
    id: QUOTE_ID,
    tourRequestId: LEAD_ID,
    eventDate: "2026-08-15",
    venue: "Quinta do Hespanhol, Mafra",
    locale: "pt",
    totalCents: 192_000,
    currency: "eur",
    depositPercent: 30,
    status: quoteStatus,
  };
}

/** The deposit's charge as Stripe has it, after `refundedCents` went back. */
function depositCharge(refundedCents: number, overrides: Partial<Stripe.Charge> = {}) {
  return {
    id: "ch_deposit",
    object: "charge",
    amount: 57_600,
    amount_refunded: refundedCents,
    refunded: refundedCents >= 57_600,
    payment_intent: "pi_deposit",
    application_fee: "fee_deposit",
    application_fee_amount: DEPOSIT_FEE,
    refunds: { data: refundedCents > 0 ? [{ id: "re_dashboard" }] : [] },
    ...overrides,
  } as unknown as Stripe.Charge;
}

/** Stripe accepts the refund it is asked for, and returns the fee in proportion. */
function stripeRefundsAsAsked(options: { feeReturnedByStripe?: (target: number) => number } = {}) {
  let feeReturned = 0;
  intentsRetrieve.mockImplementation(async () => ({
    id: "pi_deposit",
    latest_charge: depositCharge(0),
  }));
  refundsCreate.mockImplementation(async (params: { amount: number }) => {
    const target = Math.round((DEPOSIT_FEE * params.amount) / 57_600);
    feeReturned += options.feeReturnedByStripe ? options.feeReturnedByStripe(target) : target;
    return { id: `re_admin_${params.amount}`, amount: params.amount, status: "succeeded" };
  });
  feesRetrieve.mockImplementation(async () => ({ id: "fee_deposit", amount_refunded: feeReturned }));
  feesCreateRefund.mockImplementation(async (_id: string, params: { amount: number }) => {
    feeReturned += params.amount;
    return { id: "fr_top_up" };
  });
}

beforeEach(() => {
  // Reset, not clear: a Stripe stand-in one case shaped must not answer the next.
  vi.resetAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  stripeConfigured = true;
  quoteStatus = "deposit_paid";
  leadRows = [
    { id: LEAD_ID, name: "Ana Silva", email: "ana@example.com", phone: "+351912345678" },
  ];
  payments = new Map([
    [DEPOSIT_ID, instalment("deposit", "paid")],
    [BALANCE_ID, instalment("balance", "pending")],
  ]);

  // The compare-and-set, kept: a write lands only on the amount it read.
  recordPaymentRefund.mockImplementation(
    async (
      read: QuotePayment,
      refund: { refundedAmountCents: number; stripeRefundId?: string | null },
    ) => {
      const current = payments.get(read.id);
      if (!current || current.refundedAmountCents !== read.refundedAmountCents) return null;
      const next = {
        ...current,
        status: instalmentStatusAfterRefund(current, refund.refundedAmountCents),
        refundedAmountCents: refund.refundedAmountCents,
        stripeRefundId: refund.stripeRefundId ?? current.stripeRefundId,
      };
      payments.set(read.id, next);
      return next;
    },
  );
  recordPaymentRefundFee.mockImplementation(async (id: string, refundedFeeCents: number) => {
    const next = { ...payments.get(id)!, refundedFeeCents };
    payments.set(id, next);
    return next;
  });
  cancelQuoteAndOpenInstalments.mockImplementation(async () => {
    if (quoteStatus === "cancelled") return null;
    quoteStatus = "cancelled";
    const writtenOff: QuotePayment[] = [];
    for (const [id, payment] of payments) {
      if (payment.status === "pending" || payment.status === "issued") {
        const next = { ...payment, status: "cancelled" as const };
        payments.set(id, next);
        writtenOff.push(next);
      }
    }
    return { quote: quoteRow(), writtenOff };
  });
  sendLoggedEmail.mockResolvedValue({ status: "sent", providerMessageId: "re_mail" });
});

function auditActions(): string[] {
  return recordAuditOrWarn.mock.calls.map(([entry]) => (entry as { action: string }).action);
}

// ---------------------------------------------------------------------------

describe("refundQuotePayment — the quote card's Reembolsar", () => {
  it("refunds the whole deposit on the account that took it, with the fee in proportion", async () => {
    stripeRefundsAsAsked();

    const outcome = await refundQuotePayment({
      paymentId: DEPOSIT_ID,
      refundCents: 57_600,
      cancelEvent: false,
      actorUserId: ADMIN_ID,
    });

    expect(outcome).toMatchObject({ status: "refunded", refundedCents: 57_600, eventCancelled: false });
    expect(refundsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        payment_intent: "pi_deposit",
        amount: 57_600,
        refund_application_fee: true,
        metadata: expect.objectContaining({ quotePaymentId: DEPOSIT_ID, via: "admin" }),
      }),
      {
        stripeAccount: "acct_test_agorasim",
        idempotencyKey: `quote-refund:${DEPOSIT_ID}:0:57600`,
      },
    );

    // The row says what Stripe says: all of it back, and all of the fee.
    expect(payments.get(DEPOSIT_ID)).toMatchObject({
      status: "refunded",
      refundedAmountCents: 57_600,
      refundedFeeCents: DEPOSIT_FEE,
      stripeRefundId: "re_admin_57600",
    });
    // Stripe returned the fee itself; nothing to top up.
    expect(feesCreateRefund).not.toHaveBeenCalled();
    // Left on: the quote keeps its status.
    expect(cancelQuoteAndOpenInstalments).not.toHaveBeenCalled();
    expect(quoteStatus).toBe("deposit_paid");

    expect(recordAuditOrWarn).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: ADMIN_ID,
        action: "quote.payment_refunded",
        entityType: "tour_request",
        entityId: LEAD_ID,
        after: expect.objectContaining({
          instalment: "deposit",
          via: "admin",
          amountCents: 57_600,
          refundedAmountCents: 57_600,
          applicationFeeCents: DEPOSIT_FEE,
          refundedFeeCents: DEPOSIT_FEE,
          stripeRefundId: "re_admin_57600",
          stripeChargeId: "ch_deposit",
        }),
      }),
    );
  });

  it("returns half the fee for half the deposit, and tops the second half up", async () => {
    stripeRefundsAsAsked();

    await refundQuotePayment({
      paymentId: DEPOSIT_ID,
      refundCents: 28_800,
      cancelEvent: false,
      actorUserId: ADMIN_ID,
    });

    // A partial refund is not a cancellation: still paid, the amount beside it.
    expect(payments.get(DEPOSIT_ID)).toMatchObject({
      status: "paid",
      refundedAmountCents: 28_800,
      refundedFeeCents: 1_728,
    });

    await refundQuotePayment({
      paymentId: DEPOSIT_ID,
      refundCents: 28_800,
      cancelEvent: false,
      actorUserId: ADMIN_ID,
    });

    // A second, deliberate refund of the same amount is a new Stripe request.
    expect(refundsCreate).toHaveBeenLastCalledWith(
      expect.objectContaining({ amount: 28_800 }),
      expect.objectContaining({ idempotencyKey: `quote-refund:${DEPOSIT_ID}:28800:28800` }),
    );
    expect(payments.get(DEPOSIT_ID)).toMatchObject({
      status: "refunded",
      refundedAmountCents: 57_600,
      refundedFeeCents: DEPOSIT_FEE,
    });
  });

  it("tops the fee up by the cent Stripe's rounding left behind", async () => {
    stripeRefundsAsAsked({ feeReturnedByStripe: (target) => target - 1 });

    await refundQuotePayment({
      paymentId: DEPOSIT_ID,
      refundCents: 19_200,
      cancelEvent: false,
      actorUserId: ADMIN_ID,
    });

    // A third of €34.56 is €11.52; Stripe gave back €11.51.
    expect(feesCreateRefund).toHaveBeenCalledWith(
      "fee_deposit",
      { amount: 1 },
      { idempotencyKey: `quote-fee-refund:${DEPOSIT_ID}:1152` },
    );
    expect(payments.get(DEPOSIT_ID)?.refundedFeeCents).toBe(1_152);
  });

  it("cancels the event and writes the balance off when the box is ticked", async () => {
    stripeRefundsAsAsked();

    const outcome = await refundQuotePayment({
      paymentId: DEPOSIT_ID,
      refundCents: 57_600,
      cancelEvent: true,
      actorUserId: ADMIN_ID,
    });

    expect(outcome).toMatchObject({ status: "refunded", eventCancelled: true });
    expect(quoteStatus).toBe("cancelled");
    expect(payments.get(BALANCE_ID)?.status).toBe("cancelled");
    // The money first, then the cancellation — each with its own audit row.
    expect(auditActions()).toEqual(["quote.payment_refunded", "quote.cancelled"]);
    expect(recordAuditOrWarn).toHaveBeenLastCalledWith(
      expect.objectContaining({
        actorUserId: ADMIN_ID,
        action: "quote.cancelled",
        after: expect.objectContaining({ status: "cancelled", writtenOff: ["balance"] }),
      }),
    );
  });

  it("writes nothing and cancels nothing when Stripe refuses", async () => {
    intentsRetrieve.mockResolvedValue({ id: "pi_deposit", latest_charge: depositCharge(0) });
    refundsCreate.mockRejectedValue(new Error("Your card was declined."));

    const outcome = await refundQuotePayment({
      paymentId: DEPOSIT_ID,
      refundCents: 57_600,
      cancelEvent: true,
      actorUserId: ADMIN_ID,
    });

    expect(outcome).toMatchObject({ status: "refund-failed" });
    expect(recordPaymentRefund).not.toHaveBeenCalled();
    expect(cancelQuoteAndOpenInstalments).not.toHaveBeenCalled();
    expect(recordAuditOrWarn).not.toHaveBeenCalled();
    expect(sendLoggedEmail).not.toHaveBeenCalled();
    expect(quoteStatus).toBe("deposit_paid");
  });

  it("refuses amounts outside the ceiling, and instalments that were never paid", async () => {
    payments.set(DEPOSIT_ID, instalment("deposit", "paid", { refundedAmountCents: 28_800 }));

    for (const refundCents of [0, -100, 28_801]) {
      expect(
        await refundQuotePayment({
          paymentId: DEPOSIT_ID,
          refundCents,
          cancelEvent: false,
          actorUserId: ADMIN_ID,
        }),
      ).toMatchObject({ status: "amount-invalid", maxCents: 28_800 });
    }

    for (const status of ["pending", "issued", "cancelled", "refunded"] as const) {
      payments.set(BALANCE_ID, instalment("balance", status));
      expect(
        await refundQuotePayment({
          paymentId: BALANCE_ID,
          refundCents: 100,
          cancelEvent: false,
          actorUserId: ADMIN_ID,
        }),
      ).toMatchObject({ status: "not-refundable" });
    }

    expect(
      await refundQuotePayment({
        paymentId: "ffffffff-0000-4000-8000-000000000000",
        refundCents: 100,
        cancelEvent: false,
        actorUserId: ADMIN_ID,
      }),
    ).toEqual({ status: "not-found" });

    expect(refundsCreate).not.toHaveBeenCalled();
    expect(recordPaymentRefund).not.toHaveBeenCalled();
  });

  it("refuses an instalment with nothing in Stripe to refund against", async () => {
    payments.set(DEPOSIT_ID, instalment("deposit", "paid", { stripePaymentIntentId: null }));
    expect(
      await refundQuotePayment({
        paymentId: DEPOSIT_ID,
        refundCents: 100,
        cancelEvent: false,
        actorUserId: ADMIN_ID,
      }),
    ).toMatchObject({ status: "refund-unavailable" });

    payments.set(DEPOSIT_ID, instalment("deposit", "paid"));
    stripeConfigured = false;
    expect(
      await refundQuotePayment({
        paymentId: DEPOSIT_ID,
        refundCents: 100,
        cancelEvent: false,
        actorUserId: ADMIN_ID,
      }),
    ).toMatchObject({ status: "refund-unavailable" });
    expect(refundsCreate).not.toHaveBeenCalled();
  });
});

describe("syncQuotePaymentRefundFromStripe — a refund made in the dashboard", () => {
  it("records the refund, returns the whole fee, and never cancels the event", async () => {
    feesRetrieve.mockResolvedValue({ id: "fee_deposit", amount_refunded: 0 });
    feesCreateRefund.mockResolvedValue({ id: "fr_1" });

    const outcome = await syncQuotePaymentRefundFromStripe({ charge: depositCharge(57_600) });

    expect(outcome).toMatchObject({
      status: "synced",
      refundedAmountCents: 57_600,
      refundedFeeCents: DEPOSIT_FEE,
    });
    expect(payments.get(DEPOSIT_ID)).toMatchObject({
      status: "refunded",
      refundedAmountCents: 57_600,
      refundedFeeCents: DEPOSIT_FEE,
      stripeRefundId: "re_dashboard",
    });
    // The dashboard's default keeps the fee; the platform gives it back here.
    expect(feesCreateRefund).toHaveBeenCalledWith(
      "fee_deposit",
      { amount: DEPOSIT_FEE },
      { idempotencyKey: `quote-fee-refund:${DEPOSIT_ID}:${DEPOSIT_FEE}` },
    );
    expect(cancelQuoteAndOpenInstalments).not.toHaveBeenCalled();
    expect(recordAuditOrWarn).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: null,
        action: "quote.payment_refunded",
        after: expect.objectContaining({ via: "stripe", refundedAmountCents: 57_600 }),
      }),
    );
  });

  it("records a partial dashboard refund without calling anything off", async () => {
    feesRetrieve.mockResolvedValue({ id: "fee_deposit", amount_refunded: 0 });

    await syncQuotePaymentRefundFromStripe({
      charge: depositCharge(28_800),
      refundId: "re_partial",
    });

    expect(payments.get(DEPOSIT_ID)).toMatchObject({
      status: "paid",
      refundedAmountCents: 28_800,
      refundedFeeCents: 1_728,
      stripeRefundId: "re_partial",
    });
  });

  it("does nothing at all on a redelivery", async () => {
    feesRetrieve.mockResolvedValue({ id: "fee_deposit", amount_refunded: 0 });
    await syncQuotePaymentRefundFromStripe({ charge: depositCharge(57_600) });
    vi.clearAllMocks();

    const outcome = await syncQuotePaymentRefundFromStripe({ charge: depositCharge(57_600) });

    expect(outcome).toMatchObject({ status: "already-synced" });
    expect(recordPaymentRefund).not.toHaveBeenCalled();
    expect(recordAuditOrWarn).not.toHaveBeenCalled();
    expect(sendLoggedEmail).not.toHaveBeenCalled();
  });

  it("finds the admin refund's echo already written", async () => {
    stripeRefundsAsAsked();
    await refundQuotePayment({
      paymentId: DEPOSIT_ID,
      refundCents: 57_600,
      cancelEvent: false,
      actorUserId: ADMIN_ID,
    });

    const echo = await syncQuotePaymentRefundFromStripe({
      charge: depositCharge(57_600),
      refundId: "re_admin_57600",
    });

    expect(echo).toMatchObject({ status: "already-synced" });
    expect(auditActions()).toEqual(["quote.payment_refunded"]);
    expect(sendLoggedEmail).toHaveBeenCalledTimes(1);
  });

  it("follows a failed refund down without un-refunding the instalment", async () => {
    payments.set(
      DEPOSIT_ID,
      instalment("deposit", "refunded", {
        refundedAmountCents: 57_600,
        refundedFeeCents: DEPOSIT_FEE,
      }),
    );

    await syncQuotePaymentRefundFromStripe({
      charge: depositCharge(0, { refunded: false }),
      refundId: "re_failed",
    });

    expect(payments.get(DEPOSIT_ID)).toMatchObject({
      status: "refunded",
      refundedAmountCents: 0,
    });
    // No money newly went back, so there is nothing to tell the couple.
    expect(sendLoggedEmail).not.toHaveBeenCalled();
  });

  it("says so when no instalment was paid with the charge", async () => {
    expect(
      await syncQuotePaymentRefundFromStripe({
        charge: depositCharge(57_600, { id: "ch_other", payment_intent: "pi_other" }),
      }),
    ).toEqual({ status: "unknown-charge" });
    expect(recordPaymentRefund).not.toHaveBeenCalled();
  });
});

describe("the couple's refund notice", () => {
  it("goes once per refund, keyed on the instalment and its refunded total", async () => {
    stripeRefundsAsAsked();

    await refundQuotePayment({
      paymentId: DEPOSIT_ID,
      refundCents: 28_800,
      cancelEvent: false,
      actorUserId: ADMIN_ID,
    });
    await refundQuotePayment({
      paymentId: DEPOSIT_ID,
      refundCents: 28_800,
      cancelEvent: true,
      actorUserId: ADMIN_ID,
    });

    expect(sendLoggedEmail).toHaveBeenCalledTimes(2);
    const [first, second] = sendLoggedEmail.mock.calls;
    expect(first[0]).toEqual({
      kind: "quote-refunded",
      recipient: "guest",
      quoteId: QUOTE_ID,
      quotePaymentId: DEPOSIT_ID,
      refundedTotalCents: 28_800,
      tourRequestId: LEAD_ID,
    });
    expect(second[0]).toMatchObject({ refundedTotalCents: 57_600 });

    // The first keeps the event on; the second went out after it was called off.
    expect(first[1]).toMatchObject({ to: ["ana@example.com"] });
    expect(first[1].subject).toContain("Reembolso do seu orçamento");
    expect(first[1].text).toContain("O seu evento continua marcado");
    expect(second[1].subject).toContain("Evento cancelado");
    // pt-PT puts the sign after the amount, behind a no-break space.
    expect(second[1].text).toMatch(/Total reembolsado neste orçamento: 576\s€/);
  });

  it("is sent from a dashboard refund too", async () => {
    feesRetrieve.mockResolvedValue({ id: "fee_deposit", amount_refunded: DEPOSIT_FEE });

    await syncQuotePaymentRefundFromStripe({ charge: depositCharge(57_600) });

    expect(sendLoggedEmail).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "quote-refunded", refundedTotalCents: 57_600 }),
      expect.objectContaining({ to: ["ana@example.com"] }),
    );
  });
});

describe("cancelHeldQuote — Cancelar evento", () => {
  it("calls off a quote whose deposit has all gone back", async () => {
    payments.set(DEPOSIT_ID, instalment("deposit", "refunded", { refundedAmountCents: 57_600 }));

    const outcome = await cancelHeldQuote({ quoteId: QUOTE_ID, actorUserId: ADMIN_ID });

    expect(outcome).toMatchObject({ status: "cancelled" });
    expect(payments.get(BALANCE_ID)?.status).toBe("cancelled");
    expect(auditActions()).toEqual(["quote.cancelled"]);
    expect(sendLoggedEmail).not.toHaveBeenCalled();
  });

  it("refuses while the deposit is still held, or once already cancelled", async () => {
    expect(await cancelHeldQuote({ quoteId: QUOTE_ID, actorUserId: ADMIN_ID })).toMatchObject({
      status: "not-held",
    });

    payments.set(DEPOSIT_ID, instalment("deposit", "refunded", { refundedAmountCents: 57_600 }));
    quoteStatus = "cancelled";
    expect(await cancelHeldQuote({ quoteId: QUOTE_ID, actorUserId: ADMIN_ID })).toMatchObject({
      status: "not-held",
    });
    expect(cancelQuoteAndOpenInstalments).not.toHaveBeenCalled();
  });
});
