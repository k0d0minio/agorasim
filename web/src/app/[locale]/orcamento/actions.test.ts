import { afterEach, describe, expect, it, vi } from "vitest";

/*
 * The quote page's pay action: what a tap hands the page. The session itself
 * is `lib/quote-checkout.ts`'s, tested there; here it is a stand-in, and what
 * is asserted is the request-shaped part — the payment step's payload instead
 * of a redirect to Stripe, and the refusal when the browser key is missing.
 * `lib/stripe.ts` is the real one, driven by the environment, so the switch
 * the action asks is the switch production asks.
 */
const { rateLimit, startQuoteCheckout } = vi.hoisted(() => ({
  rateLimit: vi.fn(),
  startQuoteCheckout: vi.fn(),
}));
vi.mock("@/lib/rate-limit", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/rate-limit")>()),
  rateLimit,
}));
vi.mock("@/lib/request-ip", () => ({ clientIp: vi.fn(async () => "203.0.113.1") }));
vi.mock("@/lib/quote-checkout", () => ({ startQuoteCheckout }));
vi.mock("@/lib/observability", () => ({ captureAlert: vi.fn(), captureError: vi.fn() }));

/** 32 bytes of base64url — the shape `looksLikeQuoteToken` accepts. */
const TOKEN = "A".repeat(43);

function tap(locale = "en"): FormData {
  const form = new FormData();
  form.set("token", TOKEN);
  form.set("locale", locale);
  return form;
}

async function load() {
  // Fresh modules: `lib/stripe.ts` remembers which mismatches it reported.
  vi.resetModules();
  return import("./actions");
}

function payable() {
  vi.stubEnv("VERCEL_ENV", "preview");
  vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_123");
  vi.stubEnv("STRIPE_PUBLISHABLE_KEY", "pk_test_123");
  rateLimit.mockResolvedValue({ allowed: true });
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  rateLimit.mockReset();
  startQuoteCheckout.mockReset();
});

describe("payQuote — paying on the quote page", () => {
  it("hands back what the page needs to show Stripe's form, instead of redirecting", async () => {
    payable();
    startQuoteCheckout.mockResolvedValue({
      status: "embedded",
      clientSecret: "cs_test_1_secret_2",
      stripeAccount: "acct_test_agorasim",
      instalment: { kind: "balance", amountCents: 134_400, currency: "eur" },
    });
    const { payQuote } = await load();

    // A redirect would throw here (that is how `redirect()` signals); this
    // resolves, with the payment step's payload.
    const state = await payQuote({ status: "idle" }, tap());

    expect(state).toEqual({
      status: "payment",
      payment: {
        clientSecret: "cs_test_1_secret_2",
        publishableKey: "pk_test_123",
        stripeAccount: "acct_test_agorasim",
      },
      // Named from what the tap opened, in the page's language — not from the
      // render, which may still show a deposit paid since from another phone.
      instalment: "Balance",
      amount: "€1,344",
    });
    expect(startQuoteCheckout).toHaveBeenCalledWith({ token: TOKEN, locale: "en" });
  });

  it("says payment is unavailable, and mints nothing, when the browser key is missing", async () => {
    payable();
    vi.stubEnv("STRIPE_PUBLISHABLE_KEY", "");
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { payQuote } = await load();

    const state = await payQuote({ status: "idle" }, tap());

    expect(state).toEqual({ status: "refused", reason: "unconfigured" });
    expect(startQuoteCheckout).not.toHaveBeenCalled();
  });

  it("says the same when the browser key's mode contradicts the secret key", async () => {
    payable();
    vi.stubEnv("STRIPE_PUBLISHABLE_KEY", "pk_live_123");
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { payQuote } = await load();

    expect(await payQuote({ status: "idle" }, tap())).toEqual({
      status: "refused",
      reason: "unconfigured",
    });
    expect(startQuoteCheckout).not.toHaveBeenCalled();
  });

  it("turns every other outcome into the sentence it already had", async () => {
    payable();
    const { payQuote } = await load();

    for (const [outcome, state] of [
      [{ status: "paid" }, { status: "paid" }],
      [{ status: "awaiting" }, { status: "awaiting" }],
      [{ status: "not-due" }, { status: "refused", reason: "notDue" }],
      [{ status: "settled" }, { status: "refused", reason: "settled" }],
      [{ status: "failed" }, { status: "refused", reason: "failed" }],
      [{ status: "not-found" }, { status: "invalid" }],
    ] as const) {
      startQuoteCheckout.mockResolvedValueOnce(outcome);
      expect(await payQuote({ status: "idle" }, tap()), outcome.status).toEqual(state);
    }
  });

  it("refuses a throttled tap, and a body that carries no token, before any session", async () => {
    payable();
    const { payQuote } = await load();

    rateLimit.mockResolvedValueOnce({ allowed: false, retryAfterSeconds: 60 });
    vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(await payQuote({ status: "idle" }, tap())).toEqual({
      status: "refused",
      reason: "failed",
    });

    const form = tap();
    form.set("token", "not a token");
    expect(await payQuote({ status: "idle" }, form)).toEqual({ status: "invalid" });
    expect(startQuoteCheckout).not.toHaveBeenCalled();
  });
});
