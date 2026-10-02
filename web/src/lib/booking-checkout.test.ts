import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Experience } from "@/content/experiences";

/**
 * The booking's embedded checkout, at its Stripe boundary: the session it
 * opens (Stripe's form inside `/reservar`, with the same fee, expiry and
 * confirmation page as the hosted page it replaced), and the release a guest
 * triggers by going back from the payment step.
 *
 * Stripe is a stand-in whose calls are asserted; the database answers each
 * awaited query from a queue the test fills, in the order the code asks.
 */

// ---------------------------------------------------------------------------
// The database — every awaited chain takes the next queued answer.
// ---------------------------------------------------------------------------

let answers: unknown[][] = [];
const writes: { op: string; values?: unknown }[] = [];

function chain(op: string): unknown {
  const proxy: unknown = new Proxy(
    {},
    {
      get(_target, prop) {
        if (prop === "then") {
          return (onFulfilled?: (value: unknown) => unknown) =>
            Promise.resolve(answers.shift() ?? []).then(onFulfilled);
        }
        if (prop === "values" || prop === "set") {
          return (values: unknown) => {
            writes.push({ op, values });
            return proxy;
          };
        }
        return () => proxy;
      },
    },
  );
  return proxy;
}

vi.mock("@/db", async () => {
  const schema = await vi.importActual<typeof import("@/db/schema")>("@/db/schema");
  return {
    ...schema,
    db: {
      select: () => chain("select"),
      insert: () => chain("insert"),
      update: () => chain("update"),
    },
  };
});

// ---------------------------------------------------------------------------
// Stripe, whole.
// ---------------------------------------------------------------------------

const sessionsCreate = vi.fn();
const sessionsRetrieve = vi.fn();
const sessionsExpire = vi.fn();
let connectedAccount: string | null = null;
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
  }),
}));

vi.mock("@/lib/site-origin", () => ({ siteUrl: () => "https://agorasim.example" }));
vi.mock("@/lib/audit", () => ({ recordAuditOrWarn: vi.fn() }));
vi.mock("@/lib/message-log", () => ({ sendLoggedEmail: vi.fn() }));
vi.mock("@/lib/email", () => ({
  isEmailConfigured: () => true,
  teamRecipients: () => ["equipa@agorasim.pt"],
  sendEmail: vi.fn(),
}));
vi.mock("@/lib/observability", () => ({ captureAlert: vi.fn(), captureError: vi.fn() }));

const { releaseBookingCheckout, sessionIdFromClientSecret, startBookingCheckout } =
  await import("./booking-checkout");
const { holdExpiryFrom } = await import("@/lib/bookings");
const { commissionOn } = await import("@/lib/commission");

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const BOOKING_ID = "aaaaaaaa-1111-4111-8111-111111111111";
const SESSION_ID = "cs_test_a1B2c3D4e5";
const CLIENT_SECRET = `${SESSION_ID}_secret_Zz9Yy8Xx7`;

const tour = {
  slug: "rural-saloia",
  kind: "signature",
  title: { pt: "Rural Saloia", en: "Rural Saloia" },
  tagline: { pt: "O campo saloio", en: "The Saloia countryside" },
} as unknown as Experience;

function start() {
  return startBookingCheckout({
    guest: {
      name: "Ana",
      email: "ana@example.com",
      phone: null,
      message: null,
      marketingConsent: false,
    },
    locale: "en",
    date: "2026-11-14",
    slot: "morning",
    mode: "public",
    party: { adults: 2, children: 0, infants: 0 },
    vehicleClass: "classic-small",
    experience: tour,
    addOns: [],
    lines: [{ slug: "rural-saloia", kind: "tour", unit: "adult", unitCents: 9_500, quantity: 2 }],
    totalCents: 19_000,
  });
}

beforeEach(() => {
  answers = [];
  writes.length = 0;
  connectedAccount = null;
  stripeConfigured = true;
  sessionsCreate.mockReset();
  sessionsRetrieve.mockReset();
  sessionsExpire.mockReset();
});

// ---------------------------------------------------------------------------
// Starting a checkout
// ---------------------------------------------------------------------------

describe("startBookingCheckout — the embedded session", () => {
  function queueInserts() {
    // The lead, the booking, then the session id written back.
    answers.push([{ id: "lead-1" }], [{ id: BOOKING_ID }], []);
  }

  it("opens Stripe's form in our page and hands back its client secret, not a URL", async () => {
    queueInserts();
    sessionsCreate.mockResolvedValue({ id: SESSION_ID, client_secret: CLIENT_SECRET, url: null });

    const started = await start();

    expect(started).toEqual({ clientSecret: CLIENT_SECRET, bookingId: BOOKING_ID });
    const [params] = sessionsCreate.mock.calls[0];
    expect(params.ui_mode).toBe("embedded_page");
    // Paying ends on our own confirmation page, never a stripe.com address…
    expect(params.redirect_on_completion).toBe("always");
    expect(params.return_url).toBe(
      "https://agorasim.example/en/reservar/confirmacao?session_id={CHECKOUT_SESSION_ID}",
    );
    // …and there is no hosted page to come back from.
    expect(params).not.toHaveProperty("success_url");
    expect(params).not.toHaveProperty("cancel_url");
  });

  it("expires the session at the same instant the car's hold lapses", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-02T10:00:00Z"));
    try {
      queueInserts();
      sessionsCreate.mockResolvedValue({ id: SESSION_ID, client_secret: CLIENT_SECRET });

      await start();

      const [params] = sessionsCreate.mock.calls[0];
      const hold = holdExpiryFrom(new Date("2026-10-02T10:00:00Z"));
      expect(params.expires_at).toBe(Math.floor(hold.getTime() / 1000));
      const booking = writes.find(
        (write) => write.op === "insert" && "holdExpiresAt" in (write.values as object),
      );
      expect((booking?.values as { holdExpiresAt: Date }).holdExpiresAt).toEqual(hold);
    } finally {
      vi.useRealTimers();
    }
  });

  it("takes the Connect fee on the client's account, and none without one", async () => {
    connectedAccount = "acct_test_agorasim";
    queueInserts();
    sessionsCreate.mockResolvedValue({ id: SESSION_ID, client_secret: CLIENT_SECRET });
    await start();
    let [params, options] = sessionsCreate.mock.calls[0];
    expect(params.payment_intent_data.application_fee_amount).toBe(
      commissionOn("tour", 19_000).feeCents,
    );
    expect(options).toEqual({ stripeAccount: "acct_test_agorasim" });

    connectedAccount = null;
    queueInserts();
    await start();
    [params, options] = sessionsCreate.mock.calls[1];
    expect(params.payment_intent_data).not.toHaveProperty("application_fee_amount");
    expect(options).toBeUndefined();
  });

  it("refuses a session that came back without a client secret, and frees the car", async () => {
    queueInserts();
    sessionsCreate.mockResolvedValue({ id: SESSION_ID, client_secret: null });

    await expect(start()).rejects.toThrow(/client secret/);
    expect(writes).toContainEqual(
      expect.objectContaining({
        op: "update",
        values: expect.objectContaining({ status: "cancelled" }),
      }),
    );
  });
});

// ---------------------------------------------------------------------------
// Going back from the payment step
// ---------------------------------------------------------------------------

describe("sessionIdFromClientSecret", () => {
  it("reads the session a client secret belongs to", () => {
    expect(sessionIdFromClientSecret(CLIENT_SECRET)).toBe(SESSION_ID);
    expect(sessionIdFromClientSecret("cs_live_Q1w2_secret_E3r4")).toBe("cs_live_Q1w2");
  });

  it("refuses anything not shaped like one", () => {
    expect(sessionIdFromClientSecret(SESSION_ID)).toBeNull();
    expect(sessionIdFromClientSecret("pi_123_secret_abc")).toBeNull();
    expect(sessionIdFromClientSecret(`${CLIENT_SECRET}; drop`)).toBeNull();
    expect(sessionIdFromClientSecret("")).toBeNull();
  });
});

describe("releaseBookingCheckout — back from the payment step", () => {
  it("expires the guest's own open session and closes the booking at once", async () => {
    // The pending booking, then the close's guarded update.
    answers.push([{ id: BOOKING_ID }], [{ id: BOOKING_ID, date: "2026-11-14" }]);
    sessionsRetrieve.mockResolvedValue({
      id: SESSION_ID,
      client_secret: CLIENT_SECRET,
      status: "open",
    });
    sessionsExpire.mockResolvedValue({ id: SESSION_ID, status: "expired" });

    expect(await releaseBookingCheckout(CLIENT_SECRET)).toBe("released");
    expect(sessionsExpire).toHaveBeenCalledWith(SESSION_ID, {}, undefined);
    expect(writes).toContainEqual(
      expect.objectContaining({
        op: "update",
        values: expect.objectContaining({ status: "expired" }),
      }),
    );
  });

  it("asks the connected account, where a direct charge's session lives", async () => {
    connectedAccount = "acct_test_agorasim";
    answers.push([{ id: BOOKING_ID }], [{ id: BOOKING_ID }]);
    sessionsRetrieve.mockResolvedValue({ client_secret: CLIENT_SECRET, status: "open" });

    await releaseBookingCheckout(CLIENT_SECRET);

    expect(sessionsExpire).toHaveBeenCalledWith(SESSION_ID, {}, {
      stripeAccount: "acct_test_agorasim",
    });
  });

  it("releases nothing when the booking is no longer pending", async () => {
    answers.push([]);

    expect(await releaseBookingCheckout(CLIENT_SECRET)).toBe("ignored");
    expect(sessionsRetrieve).not.toHaveBeenCalled();
    expect(sessionsExpire).not.toHaveBeenCalled();
  });

  it("releases nothing for a secret that is not the session's own", async () => {
    answers.push([{ id: BOOKING_ID }]);
    sessionsRetrieve.mockResolvedValue({
      client_secret: `${SESSION_ID}_secret_TheRealOne`,
      status: "open",
    });

    expect(await releaseBookingCheckout(CLIENT_SECRET)).toBe("ignored");
    expect(sessionsExpire).not.toHaveBeenCalled();
  });

  it("never expires a session Stripe has already completed", async () => {
    answers.push([{ id: BOOKING_ID }]);
    sessionsRetrieve.mockResolvedValue({ client_secret: CLIENT_SECRET, status: "complete" });

    expect(await releaseBookingCheckout(CLIENT_SECRET)).toBe("ignored");
    expect(sessionsExpire).not.toHaveBeenCalled();
  });

  it("does nothing with a value that is not a client secret, or with Stripe off", async () => {
    expect(await releaseBookingCheckout(SESSION_ID)).toBe("ignored");
    stripeConfigured = false;
    expect(await releaseBookingCheckout(CLIENT_SECRET)).toBe("ignored");
    expect(sessionsRetrieve).not.toHaveBeenCalled();
  });
});
