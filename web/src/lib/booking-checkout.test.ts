import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Experience } from "@/content/experiences";
import type { SlotCheck } from "@/lib/availability";

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

vi.mock("@/lib/site-origin", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/site-origin")>()),
  siteUrl: () => "https://agorasim.example",
}));
vi.mock("@/lib/audit", () => ({ recordAuditOrWarn: vi.fn() }));
vi.mock("@/lib/message-log", () => ({ sendLoggedEmail: vi.fn() }));
vi.mock("@/lib/email", () => ({
  isEmailConfigured: () => true,
  teamRecipients: () => ["equipa@agorasim.pt"],
  sendEmail: vi.fn(),
}));
vi.mock("@/lib/observability", () => ({ captureAlert: vi.fn(), captureError: vi.fn() }));

// The departure re-check of a late payment, as a stand-in: what it answers is
// the test's choice. `lib/availability.test.ts` proves the check itself.
const checkSlotAvailable = vi.fn();
vi.mock("@/lib/availability", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/availability")>()),
  checkSlotAvailable: (...args: unknown[]) => checkSlotAvailable(...args),
}));
vi.mock("@/lib/bookings", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/bookings")>()),
  slotOccupancyOn: vi.fn(async () => ({
    drivers: 0,
    vehicles: { "classic-small": 0, "classic-van": 0, touring: 0 },
  })),
}));

// ---------------------------------------------------------------------------
// The departure lock, as a recorder: which departure each call held, and the
// writes made while it was held. `lib/departure-lock.test.ts` proves the lock.
// ---------------------------------------------------------------------------

const lock = { inside: false, calls: [] as { departure: string; writes: string[] }[] };
vi.mock("@/lib/departure-lock", () => ({
  withDepartureLock: async (date: string, slot: string, run: () => Promise<unknown>) => {
    const call = { departure: `${date}:${slot}`, writes: [] as string[] };
    lock.calls.push(call);
    const before = writes.length;
    lock.inside = true;
    try {
      return await run();
    } finally {
      lock.inside = false;
      call.writes = writes.slice(before).map((write) => write.op);
    }
  },
}));

const {
  closeUnpaidBooking,
  confirmPaidBooking,
  expireLapsedCheckoutsOn,
  releaseBookingCheckout,
  sessionIdFromClientSecret,
  startBookingCheckout,
} = await import("./booking-checkout");
const { BOOKING_HOLD_MINUTES, checkoutSessionExpiryFrom, holdExpiryFrom } = await import(
  "@/lib/bookings"
);
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

/** The departure re-check's answer: a free car, and a seat in a new open car. */
const fits: SlotCheck = {
  ok: true,
  slot: {} as Extract<SlotCheck, { ok: true }>["slot"],
  vehicleClass: "classic-small",
  sharedCarId: "eeeeeeee-0000-4000-8000-000000000001",
};

function start(assign: () => Promise<SlotCheck> = async () => fits) {
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
    assign,
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
  checkSlotAvailable.mockReset();
  lock.calls.length = 0;
});

// ---------------------------------------------------------------------------
// Starting a checkout
// ---------------------------------------------------------------------------

describe("startBookingCheckout — the embedded session", () => {
  function queueInserts() {
    // No lapsed checkout on the departure, then the lead, the booking, then
    // the session id written back.
    answers.push([], [{ id: "lead-1" }], [{ id: BOOKING_ID }], []);
  }

  it("opens Stripe's form in our page and hands back its client secret, not a URL", async () => {
    queueInserts();
    sessionsCreate.mockResolvedValue({ id: SESSION_ID, client_secret: CLIENT_SECRET, url: null });

    const started = await start();

    expect(started).toEqual({ ok: true, clientSecret: CLIENT_SECRET, bookingId: BOOKING_ID });
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

  it("holds the car for 15 minutes, and gives the session Stripe's shortest expiry", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-02T10:00:00Z"));
    try {
      queueInserts();
      sessionsCreate.mockResolvedValue({ id: SESSION_ID, client_secret: CLIENT_SECRET });

      await start();

      expect(BOOKING_HOLD_MINUTES).toBe(15);
      const [params] = sessionsCreate.mock.calls[0];
      const hold = holdExpiryFrom(new Date("2026-10-02T10:00:00Z"));
      expect(hold).toEqual(new Date("2026-10-02T10:15:00Z"));
      // Stripe refuses a Checkout Session that expires sooner than 30 minutes.
      expect(params.expires_at).toBe(
        Math.floor(new Date("2026-10-02T10:30:00Z").getTime() / 1000),
      );
      expect(checkoutSessionExpiryFrom(new Date("2026-10-02T10:00:00Z"))).toEqual(
        new Date("2026-10-02T10:30:00Z"),
      );
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

  it("re-checks and holds the car under the departure's lock, and calls Stripe after it", async () => {
    queueInserts();
    let checkedInside = false;
    let stripeInside = true;
    sessionsCreate.mockImplementation(async () => {
      stripeInside = lock.inside;
      return { id: SESSION_ID, client_secret: CLIENT_SECRET };
    });

    await start(async () => {
      checkedInside = lock.inside;
      return fits;
    });

    expect(lock.calls).toEqual([
      { departure: "2026-11-14:morning", writes: ["insert", "insert"] },
    ]);
    expect(checkedInside).toBe(true);
    // The hold is written; a slow Stripe must not keep the next guest waiting.
    expect(stripeInside).toBe(false);
    const booking = writes.find(
      (write) => write.op === "insert" && "vehicleClass" in (write.values as object),
    );
    expect(booking?.values).toMatchObject({
      vehicleClass: "classic-small",
      sharedCarId: "eeeeeeee-0000-4000-8000-000000000001",
    });
  });

  it("returns the re-check's refusal, and writes nothing and opens no session", async () => {
    const started = await start(async () => ({ ok: false, reason: "no-vehicle" }));

    expect(started).toEqual({ ok: false, reason: "no-vehicle" });
    expect(writes).toEqual([]);
    expect(sessionsCreate).not.toHaveBeenCalled();
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

describe("closeUnpaidBooking — a payment link outlives its checkout", () => {
  it("gives the car back and keeps the link booking pending", async () => {
    // The payment-link release finds the row: it is a link booking.
    answers.push([{ id: BOOKING_ID }]);

    await closeUnpaidBooking({ sessionId: SESSION_ID, status: "expired" });

    expect(writes).toEqual([
      { op: "update", values: expect.objectContaining({ stripeSessionId: null }) },
    ]);
    expect(writes[0].values).not.toHaveProperty("status");
  });

  it("closes an ordinary checkout as before", async () => {
    answers.push([], [{ id: BOOKING_ID, date: "2026-11-14" }]);

    await closeUnpaidBooking({ sessionId: SESSION_ID, status: "expired" });

    expect(writes[1]).toEqual({
      op: "update",
      values: expect.objectContaining({ status: "expired" }),
    });
  });
});

describe("releaseBookingCheckout — back from the payment step", () => {
  it("expires the guest's own open session and closes the booking at once", async () => {
    // The pending booking, the payment-link release (not a link booking, so
    // nothing), then the close's guarded update.
    answers.push([{ id: BOOKING_ID }], [], [{ id: BOOKING_ID, date: "2026-11-14" }]);
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
    answers.push([{ id: BOOKING_ID }], [], [{ id: BOOKING_ID }]);
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

// ---------------------------------------------------------------------------
// The gap between the hold and its session (JAM-291)
// ---------------------------------------------------------------------------

describe("expireLapsedCheckoutsOn — a lapsed hold's session closes before its seats are resold", () => {
  it("expires the open session of a lapsed hold at Stripe, then closes its booking", async () => {
    // The lapsed holds, the payment-link release (not a link), the close.
    answers.push([{ sessionId: "cs_test_lapsed" }], [], [{ id: BOOKING_ID, date: "2026-11-14" }]);
    sessionsExpire.mockResolvedValue({ id: "cs_test_lapsed", status: "expired" });

    expect(await expireLapsedCheckoutsOn("2026-11-14", "morning")).toBe(1);
    expect(sessionsExpire).toHaveBeenCalledWith("cs_test_lapsed", {}, undefined);
    expect(writes).toContainEqual(
      expect.objectContaining({
        op: "update",
        values: expect.objectContaining({ status: "expired" }),
      }),
    );
  });

  it("leaves a session that Stripe will not expire to its webhook", async () => {
    answers.push([{ sessionId: "cs_test_paid" }]);
    sessionsExpire.mockRejectedValue(new Error("This Checkout Session is complete"));

    expect(await expireLapsedCheckoutsOn("2026-11-14", "morning")).toBe(0);
    expect(writes).toEqual([]);
  });

  it("runs before the new checkout takes the seats, and never costs the sale", async () => {
    answers.push([{ sessionId: "cs_test_lapsed" }], [{ id: "lead-1" }], [{ id: BOOKING_ID }], []);
    sessionsExpire.mockRejectedValue(new Error("Stripe is down"));
    sessionsCreate.mockResolvedValue({ id: SESSION_ID, client_secret: CLIENT_SECRET });

    const started = await start();

    expect(started).toMatchObject({ ok: true, bookingId: BOOKING_ID });
    expect(sessionsExpire.mock.invocationCallOrder[0]).toBeLessThan(
      sessionsCreate.mock.invocationCallOrder[0],
    );
  });
});

describe("confirmPaidBooking — a payment that lands after its hold lapsed", () => {
  const lapsedRow = () => ({
    id: BOOKING_ID,
    status: "pending",
    tourRequestId: null,
    stripeSessionId: SESSION_ID,
    stripePaymentIntentId: null,
    holdExpiresAt: new Date(Date.now() - 60_000),
    date: "2026-11-14",
    slot: "morning",
    mode: "public",
    experienceSlug: "rural-saloia",
    partySize: 2,
    vehicleClass: "classic-small",
    sharedCarId: null,
    locale: "en",
    amountCents: 19_000,
    currency: "eur",
  });

  it("does not confirm a booking whose seats another guest took", async () => {
    answers.push([lapsedRow()]);
    checkSlotAvailable.mockResolvedValue({ ok: false, reason: "no-vehicle" });

    const outcome = await confirmPaidBooking({ sessionId: SESSION_ID, catalogue: new Map() });

    expect(outcome.status).toBe("not-payable");
    expect(lock.calls).toEqual([{ departure: "2026-11-14:morning", writes: [] }]);
    expect(writes).not.toContainEqual(
      expect.objectContaining({ values: expect.objectContaining({ status: "confirmed" }) }),
    );
  });

  it("takes the seats back under the lock and confirms when they are still free", async () => {
    const row = lapsedRow();
    // The booking, the reclaimed hold, then the confirm guard.
    answers.push([row], [{ id: BOOKING_ID }], [{ ...row, status: "confirmed" }]);
    checkSlotAvailable.mockResolvedValue(fits);

    const outcome = await confirmPaidBooking({ sessionId: SESSION_ID, catalogue: new Map() });

    expect(outcome).toMatchObject({ status: "confirmed", alreadyConfirmed: false });
    expect(checkSlotAvailable).toHaveBeenCalledWith(
      expect.objectContaining({ date: "2026-11-14", slot: "morning", audience: "team" }),
    );
    expect(lock.calls).toEqual([{ departure: "2026-11-14:morning", writes: ["update"] }]);
    expect(writes).toContainEqual(
      expect.objectContaining({ values: expect.objectContaining({ status: "confirmed" }) }),
    );
  });

  it("re-checks nothing for a payment inside its hold", async () => {
    const row = { ...lapsedRow(), holdExpiresAt: new Date(Date.now() + 60_000) };
    answers.push([row], [{ ...row, status: "confirmed" }]);

    const outcome = await confirmPaidBooking({ sessionId: SESSION_ID, catalogue: new Map() });

    expect(outcome.status).toBe("confirmed");
    expect(checkSlotAvailable).not.toHaveBeenCalled();
    expect(lock.calls).toEqual([]);
  });
});
