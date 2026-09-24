import { beforeEach, describe, expect, it, vi } from "vitest";

import type Stripe from "stripe";

import type { QuotePayment } from "@/db";

/**
 * Paying a quote — the mint behind the quote page's button, and the recording
 * the webhook and the return page share.
 *
 * Tested at its boundaries: Stripe is a stand-in whose calls are asserted, the
 * quote module's reads and guarded writes are stand-ins whose answers each test
 * queues, and the message log is a spy. The pure rules underneath — which
 * instalment is due, the 6% — are the real ones (`dueInstalment`,
 * `commissionOn`), so what is asserted is what a real tap would do.
 *
 * The one rule every mint case serves: never two payable sessions for one
 * instalment. The recording cases serve the other: the money is recorded and
 * each receipt goes once, whichever of the webhook and the return page gets
 * there first.
 */

// ---------------------------------------------------------------------------
// The database — only the lead lookup reaches it directly.
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
// The quote module: the real pure rules, stand-ins for every query.
// ---------------------------------------------------------------------------

const getQuoteByAccessTokenHash = vi.fn();
const getQuote = vi.fn();
const getPayment = vi.fn();
const getPaymentBySessionId = vi.fn();
const markPaymentIssued = vi.fn();
const reissuePayment = vi.fn();
const markPaymentPaid = vi.fn();

vi.mock("@/lib/quotes", async () => {
  const actual = await vi.importActual<typeof import("@/lib/quotes")>("@/lib/quotes");
  return {
    ...actual,
    getQuoteByAccessTokenHash: (...args: unknown[]) => getQuoteByAccessTokenHash(...args),
    getQuote: (...args: unknown[]) => getQuote(...args),
    getPayment: (...args: unknown[]) => getPayment(...args),
    getPaymentBySessionId: (...args: unknown[]) => getPaymentBySessionId(...args),
    markPaymentIssued: (...args: unknown[]) => markPaymentIssued(...args),
    reissuePayment: (...args: unknown[]) => reissuePayment(...args),
    markPaymentPaid: (...args: unknown[]) => markPaymentPaid(...args),
  };
});

// ---------------------------------------------------------------------------
// Stripe, whole.
// ---------------------------------------------------------------------------

const sessionsCreate = vi.fn();
const sessionsRetrieve = vi.fn();
const sessionsExpire = vi.fn();
const intentsRetrieve = vi.fn();
let connectedAccount: string | null = "acct_test_agorasim";
let stripeConfigured = true;

vi.mock("@/lib/stripe", () => ({
  isStripeConfigured: () => stripeConfigured,
  connectedAccountId: () => connectedAccount,
  onConnectedAccount: (options?: Record<string, unknown>) =>
    connectedAccount ? { ...options, stripeAccount: connectedAccount } : options,
  onOwningAccount: (run: (options?: unknown) => unknown) =>
    run(connectedAccount ? { stripeAccount: connectedAccount } : undefined),
  stripe: () => ({
    checkout: {
      sessions: {
        create: (...args: unknown[]) => sessionsCreate(...args),
        retrieve: (...args: unknown[]) => sessionsRetrieve(...args),
        expire: (...args: unknown[]) => sessionsExpire(...args),
      },
    },
    paymentIntents: { retrieve: (...args: unknown[]) => intentsRetrieve(...args) },
  }),
}));

const sendLoggedEmail = vi.fn();
vi.mock("@/lib/message-log", () => ({
  sendLoggedEmail: (...args: unknown[]) => sendLoggedEmail(...args),
}));
vi.mock("@/lib/email", () => ({
  isEmailConfigured: () => true,
  teamRecipients: () => ["equipa@agorasim.pt"],
  sendEmail: vi.fn(),
}));
vi.mock("@/lib/observability", () => ({ captureAlert: vi.fn(), captureError: vi.fn() }));

const { reconcileQuoteReturn, recordQuotePayment, startQuoteCheckout, quoteSessionMetadata } =
  await import("./quote-checkout");
const { issueQuoteToken } = await import("@/lib/quote-token");
const { TERMS_VERSION } = await import("@/content/terms");
const { commissionOn } = await import("@/lib/commission");
const { captureAlert } = await import("@/lib/observability");

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const QUOTE_ID = "aaaaaaaa-1111-4111-8111-111111111111";
const LEAD_ID = "bbbbbbbb-2222-4222-8222-222222222222";
const DEPOSIT_ID = "cccccccc-3333-4333-8333-333333333333";
const BALANCE_ID = "dddddddd-4444-4444-8444-444444444444";
// Well before the balance falls due on 1 August.
const NOW = new Date("2026-06-01T10:00:00Z");

function instalment(
  kind: "deposit" | "balance",
  status: QuotePayment["status"],
  overrides: Partial<QuotePayment> = {},
): QuotePayment {
  return {
    id: kind === "deposit" ? DEPOSIT_ID : BALANCE_ID,
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
    createdAt: new Date("2026-05-01T10:00:00Z"),
    updatedAt: new Date("2026-05-01T10:00:00Z"),
    ...overrides,
  } as QuotePayment;
}

function quote(
  payments: QuotePayment[],
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    id: QUOTE_ID,
    tourRequestId: LEAD_ID,
    eventDate: "2026-08-15",
    venue: "Quinta do Hespanhol, Mafra",
    locale: "pt",
    lineItems: [{ label: "Carro clássico", quantity: 1, unitCents: 192_000 }],
    totalCents: 192_000,
    currency: "eur",
    depositPercent: 30,
    termsWindowDays: 30,
    termsVersion: "2026-09-10",
    acceptedTermsVersion: null,
    acceptedAt: null,
    status: "sent",
    sentAt: new Date("2026-05-01T10:00:00Z"),
    payments,
    ...overrides,
  };
}

const LEAD = {
  id: LEAD_ID,
  name: "Ana Silva",
  email: "ana@example.com",
  phone: "+351912345678",
  locale: "pt",
};

function session(overrides: Partial<Stripe.Checkout.Session> = {}): Stripe.Checkout.Session {
  return {
    id: "cs_test_new",
    status: "open",
    payment_status: "unpaid",
    url: "https://checkout.stripe.com/c/pay/cs_test_new",
    payment_intent: null,
    metadata: {
      quoteId: QUOTE_ID,
      paymentId: DEPOSIT_ID,
      kind: "deposit",
      ref: "QT-AAAAAA",
      termsVersion: TERMS_VERSION,
    },
    ...overrides,
  } as Stripe.Checkout.Session;
}

let token = "";

beforeEach(async () => {
  // Reset, not clear: a queued answer or a default from one test must not
  // leak into the next.
  vi.resetAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  connectedAccount = "acct_test_agorasim";
  stripeConfigured = true;
  leadRows = [LEAD];
  token = (await issueQuoteToken()).token;
  sendLoggedEmail.mockResolvedValue({ status: "sent", providerMessageId: "re_1" });
  sessionsCreate.mockResolvedValue(session());
});

// ---------------------------------------------------------------------------
// The tap
// ---------------------------------------------------------------------------

describe("startQuoteCheckout — the first tap on the deposit", () => {
  beforeEach(() => {
    getQuoteByAccessTokenHash.mockResolvedValue(
      quote([instalment("deposit", "pending"), instalment("balance", "pending")]),
    );
    markPaymentIssued.mockResolvedValue(instalment("deposit", "issued"));
  });

  it("charges the deposit on the connected account with the agreement's 6% as the fee", async () => {
    const outcome = await startQuoteCheckout({ token, locale: "pt", now: NOW });

    expect(outcome).toEqual({ status: "redirect", url: session().url });
    const [params, options] = sessionsCreate.mock.calls[0];
    expect(params.line_items[0].price_data.unit_amount).toBe(57_600);
    expect(params.payment_intent_data.application_fee_amount).toBe(
      commissionOn("event", 57_600).feeCents,
    );
    expect(options).toEqual({ stripeAccount: "acct_test_agorasim" });
  });

  it("labels the session with the quote, the instalment and the terms shown", async () => {
    await startQuoteCheckout({ token, locale: "en", now: NOW });

    const [params] = sessionsCreate.mock.calls[0];
    const expected = {
      quoteId: QUOTE_ID,
      paymentId: DEPOSIT_ID,
      kind: "deposit",
      termsVersion: TERMS_VERSION,
    };
    expect(params.metadata).toMatchObject(expected);
    expect(params.payment_intent_data.metadata).toMatchObject(expected);
    // The token is in the way back and nowhere else.
    expect(JSON.stringify(params.metadata)).not.toContain(token);
    expect(params.success_url).toContain(`/en/orcamento/${token}?session_id={CHECKOUT_SESSION_ID}`);
    expect(params.locale).toBe("en");
  });

  it("records the session and the rate on the instalment", async () => {
    await startQuoteCheckout({ token, locale: "pt", now: NOW });

    expect(markPaymentIssued).toHaveBeenCalledWith(DEPOSIT_ID, {
      stripeSessionId: "cs_test_new",
      commissionRateBps: 600,
      now: NOW,
    });
    expect(reissuePayment).not.toHaveBeenCalled();
  });

  it("takes no fee and charges the platform while Connect is unconfigured", async () => {
    connectedAccount = null;

    await startQuoteCheckout({ token, locale: "pt", now: NOW });

    const [params, options] = sessionsCreate.mock.calls[0];
    expect(params.payment_intent_data).not.toHaveProperty("application_fee_amount");
    expect(options).toBeUndefined();
    expect(markPaymentIssued).toHaveBeenCalledWith(
      DEPOSIT_ID,
      expect.objectContaining({ commissionRateBps: null }),
    );
  });
});

describe("startQuoteCheckout — an instalment that already has a session", () => {
  const withSession = (id: string) =>
    quote([
      instalment("deposit", "issued", { stripeSessionId: id }),
      instalment("balance", "pending"),
    ]);

  it("reuses a session that is still open under today's terms", async () => {
    getQuoteByAccessTokenHash.mockResolvedValue(withSession("cs_test_open"));
    sessionsRetrieve.mockResolvedValue(
      session({ id: "cs_test_open", url: "https://checkout.stripe.com/c/pay/cs_test_open" }),
    );

    const outcome = await startQuoteCheckout({ token, locale: "pt", now: NOW });

    expect(outcome).toEqual({
      status: "redirect",
      url: "https://checkout.stripe.com/c/pay/cs_test_open",
    });
    expect(sessionsCreate).not.toHaveBeenCalled();
    expect(sessionsExpire).not.toHaveBeenCalled();
  });

  it("expires an open session minted under older terms before minting its replacement", async () => {
    getQuoteByAccessTokenHash.mockResolvedValue(withSession("cs_test_old_terms"));
    sessionsRetrieve.mockResolvedValue(
      session({
        id: "cs_test_old_terms",
        metadata: { ...session().metadata, termsVersion: "2026-09-10" },
      }),
    );
    sessionsExpire.mockResolvedValue(session({ id: "cs_test_old_terms", status: "expired" }));
    reissuePayment.mockResolvedValue(instalment("deposit", "issued"));

    const outcome = await startQuoteCheckout({ token, locale: "pt", now: NOW });

    expect(outcome).toMatchObject({ status: "redirect" });
    expect(sessionsExpire.mock.invocationCallOrder[0]).toBeLessThan(
      sessionsCreate.mock.invocationCallOrder[0],
    );
    expect(reissuePayment).toHaveBeenCalledWith(
      DEPOSIT_ID,
      expect.objectContaining({ stripeSessionId: "cs_test_new", replacing: "cs_test_old_terms" }),
    );
  });

  it("replaces an expired session, compare-and-set on the one it replaces", async () => {
    getQuoteByAccessTokenHash.mockResolvedValue(withSession("cs_test_expired"));
    sessionsRetrieve.mockResolvedValue(session({ id: "cs_test_expired", status: "expired" }));
    reissuePayment.mockResolvedValue(instalment("deposit", "issued"));

    const outcome = await startQuoteCheckout({ token, locale: "pt", now: NOW });

    expect(outcome).toEqual({ status: "redirect", url: session().url });
    expect(sessionsExpire).not.toHaveBeenCalled();
    expect(reissuePayment).toHaveBeenCalledWith(
      DEPOSIT_ID,
      expect.objectContaining({ replacing: "cs_test_expired", commissionRateBps: 600 }),
    );
  });

  it("mints nothing while a completed session waits on a delayed method", async () => {
    getQuoteByAccessTokenHash.mockResolvedValue(withSession("cs_test_multibanco"));
    sessionsRetrieve.mockResolvedValue(
      session({ id: "cs_test_multibanco", status: "complete", payment_status: "unpaid" }),
    );

    expect(await startQuoteCheckout({ token, locale: "pt", now: NOW })).toEqual({
      status: "awaiting",
    });
    expect(sessionsCreate).not.toHaveBeenCalled();
  });

  it("mints a new session once a delayed payment has failed", async () => {
    getQuoteByAccessTokenHash.mockResolvedValue(withSession("cs_test_multibanco"));
    sessionsRetrieve.mockResolvedValue(
      session({
        id: "cs_test_multibanco",
        status: "complete",
        payment_status: "unpaid",
        payment_intent: "pi_test_multibanco",
      }),
    );
    // The Multibanco reference lapsed unpaid: the intent wants a method again.
    intentsRetrieve.mockResolvedValue({ status: "requires_payment_method" });
    reissuePayment.mockResolvedValue(instalment("deposit", "issued"));

    const outcome = await startQuoteCheckout({ token, locale: "pt", now: NOW });

    expect(outcome).toEqual({ status: "redirect", url: session().url });
    expect(reissuePayment).toHaveBeenCalledWith(
      DEPOSIT_ID,
      expect.objectContaining({ replacing: "cs_test_multibanco" }),
    );
  });

  it("keeps waiting while the delayed payment is still processing", async () => {
    getQuoteByAccessTokenHash.mockResolvedValue(withSession("cs_test_multibanco"));
    sessionsRetrieve.mockResolvedValue(
      session({
        id: "cs_test_multibanco",
        status: "complete",
        payment_status: "unpaid",
        payment_intent: "pi_test_multibanco",
      }),
    );
    intentsRetrieve.mockResolvedValue({ status: "processing" });

    expect(await startQuoteCheckout({ token, locale: "pt", now: NOW })).toEqual({
      status: "awaiting",
    });
    expect(sessionsCreate).not.toHaveBeenCalled();
  });

  it("mints nothing when Stripe cannot say what became of the last session", async () => {
    getQuoteByAccessTokenHash.mockResolvedValue(withSession("cs_test_open"));
    // A timeout, not "no such session": the first may still be open.
    sessionsRetrieve.mockRejectedValue(Object.assign(new Error("timeout"), { code: undefined }));

    expect(await startQuoteCheckout({ token, locale: "pt", now: NOW })).toEqual({
      status: "failed",
    });
    expect(sessionsCreate).not.toHaveBeenCalled();
  });

  it("records a session that completed and paid, instead of minting another", async () => {
    getQuoteByAccessTokenHash.mockResolvedValue(withSession("cs_test_paid"));
    const paid = session({
      id: "cs_test_paid",
      status: "complete",
      payment_status: "paid",
      payment_intent: "pi_test_1",
    });
    sessionsRetrieve.mockResolvedValue(paid);
    getPaymentBySessionId.mockResolvedValue({
      quote: quote([]),
      payment: instalment("deposit", "issued", { stripeSessionId: "cs_test_paid" }),
    });
    intentsRetrieve.mockResolvedValue({ latest_charge: null });
    markPaymentPaid.mockResolvedValue(
      quote([instalment("deposit", "paid"), instalment("balance", "pending")]),
    );

    expect(await startQuoteCheckout({ token, locale: "pt", now: NOW })).toEqual({
      status: "paid",
    });
    expect(sessionsCreate).not.toHaveBeenCalled();
    expect(markPaymentPaid).toHaveBeenCalledTimes(1);
  });

  it("loses a race gracefully: expires its own session and sends the couple to the winner's", async () => {
    getQuoteByAccessTokenHash.mockResolvedValue(withSession("cs_test_expired"));
    sessionsRetrieve
      .mockResolvedValueOnce(session({ id: "cs_test_expired", status: "expired" }))
      .mockResolvedValueOnce(
        session({ id: "cs_test_winner", url: "https://checkout.stripe.com/c/pay/cs_test_winner" }),
      );
    // The other tap swapped the row first.
    reissuePayment.mockResolvedValue(null);
    sessionsExpire.mockResolvedValue(session({ status: "expired" }));
    getQuote.mockResolvedValue(withSession("cs_test_winner"));

    const outcome = await startQuoteCheckout({ token, locale: "pt", now: NOW });

    expect(sessionsExpire).toHaveBeenCalledWith("cs_test_new", undefined, expect.anything());
    expect(sessionsCreate).toHaveBeenCalledTimes(1);
    expect(outcome).toEqual({
      status: "redirect",
      url: "https://checkout.stripe.com/c/pay/cs_test_winner",
    });
  });
});

describe("startQuoteCheckout — refusals", () => {
  it("does not offer the balance before its due date", async () => {
    getQuoteByAccessTokenHash.mockResolvedValue(
      quote([instalment("deposit", "paid"), instalment("balance", "pending")], {
        status: "deposit_paid",
      }),
    );

    expect(await startQuoteCheckout({ token, locale: "pt", now: NOW })).toEqual({
      status: "not-due",
    });
    expect(sessionsCreate).not.toHaveBeenCalled();
  });

  it("offers the balance from its due date on", async () => {
    getQuoteByAccessTokenHash.mockResolvedValue(
      quote([instalment("deposit", "paid"), instalment("balance", "pending")], {
        status: "deposit_paid",
      }),
    );
    markPaymentIssued.mockResolvedValue(instalment("balance", "issued"));

    const outcome = await startQuoteCheckout({
      token,
      locale: "pt",
      now: new Date("2026-08-01T09:00:00Z"),
    });

    expect(outcome).toMatchObject({ status: "redirect" });
    const [params] = sessionsCreate.mock.calls[0];
    expect(params.line_items[0].price_data.unit_amount).toBe(134_400);
    expect(params.metadata).toMatchObject({ paymentId: BALANCE_ID, kind: "balance" });
    expect(params.payment_intent_data.application_fee_amount).toBe(
      commissionOn("event", 134_400).feeCents,
    );
  });

  it("has nothing to take from a quote paid in full", async () => {
    getQuoteByAccessTokenHash.mockResolvedValue(
      quote([instalment("deposit", "paid"), instalment("balance", "paid")], { status: "paid" }),
    );

    expect(await startQuoteCheckout({ token, locale: "pt", now: NOW })).toEqual({
      status: "settled",
    });
  });

  it("finds no quote behind a cancelled one, an unknown one or a malformed link", async () => {
    getQuoteByAccessTokenHash.mockResolvedValueOnce(
      quote([instalment("deposit", "pending")], { status: "cancelled" }),
    );
    expect(await startQuoteCheckout({ token, locale: "pt", now: NOW })).toEqual({
      status: "not-found",
    });

    getQuoteByAccessTokenHash.mockResolvedValueOnce(null);
    expect(await startQuoteCheckout({ token, locale: "pt", now: NOW })).toEqual({
      status: "not-found",
    });

    getQuoteByAccessTokenHash.mockClear();
    expect(
      await startQuoteCheckout({ token: "not a token", locale: "pt", now: NOW }),
    ).toEqual({ status: "not-found" });
    // Refused before any lookup.
    expect(getQuoteByAccessTokenHash).not.toHaveBeenCalled();
  });

  it("says so, rather than failing, when Stripe is not configured or refuses", async () => {
    stripeConfigured = false;
    expect(await startQuoteCheckout({ token, locale: "pt", now: NOW })).toEqual({
      status: "unconfigured",
    });

    stripeConfigured = true;
    getQuoteByAccessTokenHash.mockResolvedValue(quote([instalment("deposit", "pending")]));
    sessionsCreate.mockRejectedValue(new Error("Stripe is down"));
    expect(await startQuoteCheckout({ token, locale: "pt", now: NOW })).toEqual({
      status: "failed",
    });
  });
});

// ---------------------------------------------------------------------------
// The money landing
// ---------------------------------------------------------------------------

describe("recordQuotePayment", () => {
  const paidSession = (overrides: Partial<Stripe.Checkout.Session> = {}) =>
    session({
      id: "cs_test_paid",
      status: "complete",
      payment_status: "paid",
      payment_intent: "pi_test_1",
      ...overrides,
    });

  beforeEach(() => {
    getPaymentBySessionId.mockResolvedValue({
      quote: quote([]),
      payment: instalment("deposit", "issued", { stripeSessionId: "cs_test_paid" }),
    });
    intentsRetrieve.mockResolvedValue({
      latest_charge: { id: "ch_test_1", application_fee_amount: 3_456 },
    });
    markPaymentPaid.mockResolvedValue(
      quote(
        [
          instalment("deposit", "paid", {
            paidAt: NOW,
            applicationFeeCents: 3_456,
          }),
          instalment("balance", "pending"),
        ],
        { status: "deposit_paid" },
      ),
    );
  });

  it("records Stripe's settlement and the terms version the page showed", async () => {
    const outcome = await recordQuotePayment(
      paidSession({
        metadata: { ...session().metadata, termsVersion: "2026-09-24" },
      }),
      { now: NOW },
    );

    expect(outcome.status).toBe("recorded");
    expect(markPaymentPaid).toHaveBeenCalledWith(
      DEPOSIT_ID,
      {
        stripeChargeId: "ch_test_1",
        stripeConnectedAccountId: "acct_test_agorasim",
        applicationFeeCents: 3_456,
        commissionRateBps: 600,
        stripePaymentIntentId: "pi_test_1",
        acceptedTermsVersion: "2026-09-24",
      },
      NOW,
    );
  });

  it("sends the deposit receipt to the couple and the team, keyed on the quote", async () => {
    await recordQuotePayment(paidSession(), { now: NOW });

    expect(sendLoggedEmail).toHaveBeenCalledTimes(2);
    const subjects = sendLoggedEmail.mock.calls.map((call) => call[0]);
    expect(subjects).toEqual([
      { kind: "deposit-received", quoteId: QUOTE_ID, tourRequestId: LEAD_ID, recipient: "guest" },
      { kind: "deposit-received", quoteId: QUOTE_ID, tourRequestId: LEAD_ID, recipient: "team" },
    ]);
    expect(sendLoggedEmail.mock.calls[0][1].to).toEqual(["ana@example.com"]);
    expect(sendLoggedEmail.mock.calls[1][1].to).toEqual(["equipa@agorasim.pt"]);
  });

  it("on a repeat delivery records nothing new, and leaves the receipts to the log's claim", async () => {
    markPaymentPaid.mockResolvedValue(null);
    getQuote.mockResolvedValue(
      quote(
        [
          instalment("deposit", "paid", { paidAt: NOW, stripePaymentIntentId: "pi_test_1" }),
          instalment("balance", "pending"),
        ],
        { status: "deposit_paid" },
      ),
    );
    sendLoggedEmail.mockResolvedValue({ status: "duplicate" });

    const outcome = await recordQuotePayment(paidSession(), { now: NOW });

    expect(outcome.status).toBe("already");
    // Asked again — a first attempt that died before its mail is finished here
    // — and the log answers "duplicate", so nobody gets a second copy.
    expect(sendLoggedEmail).toHaveBeenCalledTimes(2);
    expect(captureAlert).not.toHaveBeenCalled();
  });

  it("sends balance-paid for the balance", async () => {
    getPaymentBySessionId.mockResolvedValue({
      quote: quote([]),
      payment: instalment("balance", "issued", { stripeSessionId: "cs_test_paid" }),
    });
    markPaymentPaid.mockResolvedValue(
      quote(
        [
          instalment("deposit", "paid", { paidAt: NOW }),
          instalment("balance", "paid", { paidAt: NOW }),
        ],
        { status: "paid" },
      ),
    );

    await recordQuotePayment(
      paidSession({ metadata: { ...session().metadata, paymentId: BALANCE_ID, kind: "balance" } }),
      { now: NOW },
    );

    expect(sendLoggedEmail.mock.calls.map((call) => call[0].kind)).toEqual([
      "balance-paid",
      "balance-paid",
    ]);
  });

  it("finds a replaced session's instalment by its metadata, and records the money", async () => {
    getPaymentBySessionId.mockResolvedValue(null);
    getPayment.mockResolvedValue({
      quote: quote([]),
      payment: instalment("deposit", "issued", { stripeSessionId: "cs_test_newer" }),
    });

    const outcome = await recordQuotePayment(paidSession(), { now: NOW });

    expect(getPayment).toHaveBeenCalledWith(DEPOSIT_ID);
    expect(outcome.status).toBe("recorded");
  });

  it("does not record a session Stripe says is unpaid", async () => {
    expect(
      await recordQuotePayment(paidSession({ payment_status: "unpaid" }), { now: NOW }),
    ).toEqual({ status: "not-paid" });
    expect(markPaymentPaid).not.toHaveBeenCalled();
  });

  it("reports a session with no instalment behind it", async () => {
    getPaymentBySessionId.mockResolvedValue(null);
    getPayment.mockResolvedValue(null);

    expect(await recordQuotePayment(paidSession(), { now: NOW })).toEqual({ status: "unknown" });
  });

  it("raises the alarm, and sends no receipt, when a replaced quote is paid", async () => {
    // Paid in a tab left open after Rita sent a new version.
    markPaymentPaid.mockResolvedValue(
      quote([instalment("deposit", "paid"), instalment("balance", "pending")], {
        status: "cancelled",
      }),
    );

    await recordQuotePayment(paidSession(), { now: NOW });

    expect(captureAlert).toHaveBeenCalledTimes(1);
    expect(sendLoggedEmail).not.toHaveBeenCalled();
  });

  it("raises the alarm when a second charge lands on an instalment already paid", async () => {
    markPaymentPaid.mockResolvedValue(null);
    getQuote.mockResolvedValue(
      quote(
        [
          instalment("deposit", "paid", { stripePaymentIntentId: "pi_test_first" }),
          instalment("balance", "pending"),
        ],
        { status: "deposit_paid" },
      ),
    );

    const outcome = await recordQuotePayment(paidSession({ payment_intent: "pi_test_second" }), {
      now: NOW,
    });

    expect(outcome.status).toBe("already");
    expect(captureAlert).toHaveBeenCalledTimes(1);
    expect(sendLoggedEmail).not.toHaveBeenCalled();
  });

  it("raises the alarm when money lands on an instalment the team wrote off", async () => {
    markPaymentPaid.mockResolvedValue(null);
    getQuote.mockResolvedValue(
      quote([instalment("deposit", "cancelled"), instalment("balance", "pending")], {
        status: "deposit_paid",
      }),
    );

    await recordQuotePayment(paidSession(), { now: NOW });

    expect(captureAlert).toHaveBeenCalledTimes(1);
    expect(sendLoggedEmail).not.toHaveBeenCalled();
  });
});

describe("reconcileQuoteReturn — the page Stripe sends the couple back to", () => {
  beforeEach(() => {
    getPaymentBySessionId.mockResolvedValue({
      quote: quote([]),
      payment: instalment("deposit", "issued", { stripeSessionId: "cs_test_back_home" }),
    });
    intentsRetrieve.mockResolvedValue({ latest_charge: null });
    markPaymentPaid.mockResolvedValue(
      quote([instalment("deposit", "paid"), instalment("balance", "pending")], {
        status: "deposit_paid",
      }),
    );
  });

  it("records a paid session of this quote, as the webhook would", async () => {
    sessionsRetrieve.mockResolvedValue(
      session({ id: "cs_test_back_home", status: "complete", payment_status: "paid" }),
    );

    expect(await reconcileQuoteReturn("cs_test_back_home", QUOTE_ID, { now: NOW })).toEqual({
      kind: "confirming",
      paymentId: DEPOSIT_ID,
    });
    expect(markPaymentPaid).toHaveBeenCalledTimes(1);
  });

  it("says the money is on its way for a delayed method, and records nothing", async () => {
    sessionsRetrieve.mockResolvedValue(
      session({ id: "cs_test_back_home", status: "complete", payment_status: "unpaid" }),
    );

    expect(await reconcileQuoteReturn("cs_test_back_home", QUOTE_ID, { now: NOW })).toEqual({
      kind: "awaiting",
      paymentId: DEPOSIT_ID,
    });
    expect(markPaymentPaid).not.toHaveBeenCalled();
  });

  it("ignores a session that belongs to another quote, or to a tour", async () => {
    sessionsRetrieve.mockResolvedValueOnce(
      session({
        id: "cs_test_someone_else",
        status: "complete",
        payment_status: "paid",
        metadata: { ...session().metadata, quoteId: "eeeeeeee-5555-4555-8555-555555555555" },
      }),
    );
    expect(await reconcileQuoteReturn("cs_test_someone_else", QUOTE_ID)).toBeNull();

    sessionsRetrieve.mockResolvedValueOnce(
      session({ id: "cs_test_a_tour", status: "complete", payment_status: "paid", metadata: {} }),
    );
    expect(await reconcileQuoteReturn("cs_test_a_tour", QUOTE_ID)).toBeNull();
    expect(markPaymentPaid).not.toHaveBeenCalled();
  });

  it("does not ask Stripe about something that is not a session id", async () => {
    expect(await reconcileQuoteReturn("<script>", QUOTE_ID)).toBeNull();
    expect(sessionsRetrieve).not.toHaveBeenCalled();
  });
});

describe("quoteSessionMetadata", () => {
  it("recognises a quote session and nothing else", () => {
    expect(quoteSessionMetadata(session())).toMatchObject({
      quoteId: QUOTE_ID,
      paymentId: DEPOSIT_ID,
      kind: "deposit",
    });
    // A tour session carries a booking id instead.
    expect(quoteSessionMetadata({ metadata: { bookingId: "x" } })).toBeNull();
    // Ids that could not be looked up are not a quote's.
    expect(
      quoteSessionMetadata({
        metadata: { quoteId: "nope", paymentId: DEPOSIT_ID, kind: "deposit" },
      }),
    ).toBeNull();
    expect(quoteSessionMetadata({ metadata: null })).toBeNull();
  });
});
