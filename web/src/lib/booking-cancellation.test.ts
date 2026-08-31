import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The guest cancellation engine, exercised through the real functions.
 *
 * Four properties are worth this much scaffolding, because each one fails
 * expensively and silently:
 *
 * 1. **A double tap refunds once.** The claiming update is guarded on
 *    `status = 'confirmed'`; the loser must never reach Stripe.
 * 2. **Inside 48 hours nothing moves** — no write, and above all no refund.
 * 3. **A failed refund leaves no trace.** The booking goes back to `confirmed`
 *    with its token restored, because a booking marked refunded that was not
 *    refunded is money kept and a seat given away.
 * 4. **A spent link says nothing.** Unknown, spent and unconfirmed all answer
 *    identically, so the page cannot leak whether a booking exists.
 *
 * Only the edges are faked: the Neon client, Stripe, the mailer and the audit
 * writer. The schema is the real one, so `eq()` builds real SQL against real
 * columns, and the *contents* of the update below are what a row would get.
 */

// ---------------------------------------------------------------------------
// A fake Neon client — same shape as `app/admin/actions.test.ts` uses.
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
// Stripe, the mailer and the audit log
// ---------------------------------------------------------------------------

const refundCreate = vi.fn();
let stripeConfigured = true;

vi.mock("@/lib/stripe", () => ({
  isStripeConfigured: () => stripeConfigured,
  stripe: () => ({ refunds: { create: refundCreate } }),
}));

// Typed with their arguments, so the assertions below can read what was
// passed rather than just how many times.
const sendEmail = vi.fn<(message: unknown) => Promise<{ sent: true }>>(async () => ({
  sent: true as const,
}));
vi.mock("@/lib/email", () => ({
  isEmailConfigured: () => true,
  sendEmail: (message: unknown) => sendEmail(message),
  teamRecipients: () => ["diogo@agorasim.pt"],
}));

const recordAuditOrWarn = vi.fn<(entry: Record<string, unknown>) => Promise<void>>(
  async () => {},
);
vi.mock("@/lib/audit", () => ({
  recordAuditOrWarn: (entry: Record<string, unknown>) => recordAuditOrWarn(entry),
}));

// Dynamic, and after the mocks: a static import is hoisted above the `const`
// declarations the mock factories close over, and would read `fakeDb` before it
// exists. Same reason `app/admin/actions.test.ts` imports its subject this way.
const { cancelBooking, resolveCancellation } = await import("@/lib/booking-cancellation");
const { cancellationTokenDigest, issueCancellationToken } = await import(
  "@/lib/cancellation-token"
);

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

/** The tour leaves 2026-08-15 at 10:00 Lisbon (09:00Z). */
const WELL_BEFORE = new Date("2026-08-01T12:00:00Z");
/** Inside the 48-hour window: the deadline was 2026-08-13T09:00Z. */
const TOO_CLOSE = new Date("2026-08-14T12:00:00Z");

function bookingRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "11111111-2222-3333-4444-555555555555",
    tourRequestId: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
    date: "2026-08-15",
    slot: "morning",
    mode: "private",
    adults: 2,
    children: 0,
    infants: 0,
    vehicleClass: "classic",
    experienceSlug: "rural-saloia",
    addOns: [],
    partySize: 2,
    amountCents: 34000,
    currency: "eur",
    priceBreakdown: [],
    status: "confirmed",
    locale: "pt",
    stripeSessionId: "cs_test_1",
    stripePaymentIntentId: "pi_test_1",
    holdExpiresAt: new Date("2026-08-01T00:30:00Z"),
    confirmedAt: new Date("2026-08-01T00:00:00Z"),
    cancelledAt: null,
    cancelledVia: null,
    cancellationTokenHash: "hmac-sha256$whatever",
    createdAt: new Date("2026-08-01T00:00:00Z"),
    updatedAt: new Date("2026-08-01T00:00:00Z"),
    ...overrides,
  };
}

const leadRow = {
  id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
  name: "Sofia Almeida",
  email: "sofia@example.com",
  phone: "+351912345678",
  locale: "pt",
};

/**
 * Every string reachable from a value.
 *
 * Drizzle's `eq()` returns an SQL object that references its own table, so the
 * structure is circular and `JSON.stringify` refuses it. What the assertions
 * below actually want is "which literals did this query carry?", and that is a
 * walk, not a serialisation.
 */
function collectStrings(value: unknown, seen = new Set<unknown>()): string[] {
  if (typeof value === "string") return [value];
  if (value === null || typeof value !== "object" || seen.has(value)) return [];
  seen.add(value);
  return Object.values(value as Record<string, unknown>).flatMap((child) =>
    collectStrings(child, seen),
  );
}

/** The last `.set()` payload handed to an update. */
function lastSetPayload(): Record<string, unknown> | undefined {
  const sets = calls.filter((call) => call.method === "set");
  return sets.at(-1)?.args[0] as Record<string, unknown> | undefined;
}

function setPayloads(): Record<string, unknown>[] {
  return calls
    .filter((call) => call.method === "set")
    .map((call) => call.args[0] as Record<string, unknown>);
}

let token: string;

beforeEach(async () => {
  calls = [];
  results = [];
  stripeConfigured = true;
  refundCreate.mockReset();
  refundCreate.mockResolvedValue({ id: "re_test_1" });
  sendEmail.mockClear();
  recordAuditOrWarn.mockClear();

  process.env.BOOKING_TOKEN_SECRET = "test-secret-for-cancellation-tokens";
  token = (await issueCancellationToken()).token;
});

const catalogue = new Map();

describe("resolving a link", () => {
  it("refuses a token that is not even token-shaped, without a query", async () => {
    const resolved = await resolveCancellation("nope", WELL_BEFORE);
    expect(resolved.kind).toBe("unknown");
    // Nothing was hashed and nothing was asked of the database.
    expect(calls).toHaveLength(0);
  });

  it("answers 'unknown' for a token no booking carries", async () => {
    queueResult([]);
    expect((await resolveCancellation(token, WELL_BEFORE)).kind).toBe("unknown");
  });

  it("answers 'unknown' for a booking that is not confirmed", async () => {
    // A spent link's row has a null hash and cannot match at all; this is the
    // other case — a row found, but in no state to cancel.
    queueResult([bookingRow({ status: "refunded" })]);
    expect((await resolveCancellation(token, WELL_BEFORE)).kind).toBe("unknown");
  });

  it("looks the booking up by digest, never by the token itself", async () => {
    queueResult([bookingRow()]);
    queueResult([leadRow]);
    await resolveCancellation(token, WELL_BEFORE);

    const digest = await cancellationTokenDigest(token);
    const strings = collectStrings(calls.filter((call) => call.method === "where"));
    expect(strings).toContain(digest);
    expect(strings).not.toContain(token);
  });

  it("says 'cancellable' well before the deadline and 'too-late' inside it", async () => {
    queueResult([bookingRow()]);
    queueResult([leadRow]);
    expect((await resolveCancellation(token, WELL_BEFORE)).kind).toBe("cancellable");

    calls = [];
    results = [];
    queueResult([bookingRow()]);
    queueResult([leadRow]);
    expect((await resolveCancellation(token, TOO_CLOSE)).kind).toBe("too-late");
  });
});

describe("cancelling", () => {
  /** Queue the reads a successful cancellation makes, in order. */
  function queueHappyPath(claimed = bookingRow({ status: "refunded" })) {
    queueResult([bookingRow()]); // the booking, by digest
    queueResult([leadRow]); // its lead
    queueResult([claimed]); // the claiming update's RETURNING
    queueResult([]); // the lead moving back to "New"
  }

  it("refunds in full, frees the seat and spends the token in one write", async () => {
    queueHappyPath();

    const outcome = await cancelBooking({ token, catalogue, now: WELL_BEFORE });
    expect(outcome.status).toBe("cancelled");

    // The claiming update: the status that releases capacity, the path that
    // did it, and the token spent in the same statement.
    const claim = setPayloads()[0];
    expect(claim.status).toBe("refunded");
    expect(claim.cancelledVia).toBe("guest");
    expect(claim.cancellationTokenHash).toBeNull();
    expect(claim.cancelledAt).toEqual(WELL_BEFORE);

    // The full amount: no `amount`, which is what makes it the whole charge.
    expect(refundCreate).toHaveBeenCalledTimes(1);
    const [params, options] = refundCreate.mock.calls[0];
    expect(params.payment_intent).toBe("pi_test_1");
    expect(params).not.toHaveProperty("amount");
    expect(params.reason).toBe("requested_by_customer");
    // Keyed on the booking, so a retry cannot issue a second refund.
    expect(options.idempotencyKey).toContain(bookingRow().id);
  });

  it("writes an audit entry that names the path but never the token", async () => {
    queueHappyPath();
    await cancelBooking({ token, catalogue, now: WELL_BEFORE });

    expect(recordAuditOrWarn).toHaveBeenCalledTimes(1);
    const entry = recordAuditOrWarn.mock.calls[0][0];
    expect(entry.action).toBe("booking.cancelled_by_guest");
    expect(JSON.stringify(entry)).not.toContain(token);
  });

  it("sends the guest's receipt and the team's notice", async () => {
    queueHappyPath();
    await cancelBooking({ token, catalogue, now: WELL_BEFORE });
    expect(sendEmail).toHaveBeenCalledTimes(2);
  });

  it("refuses inside 48 hours, and touches nothing at all", async () => {
    queueResult([bookingRow()]);
    queueResult([leadRow]);

    const outcome = await cancelBooking({ token, catalogue, now: TOO_CLOSE });
    expect(outcome.status).toBe("too-late");
    expect(refundCreate).not.toHaveBeenCalled();
    expect(calls.some((call) => call.method === "update")).toBe(false);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("refuses once the tour has left", async () => {
    queueResult([bookingRow()]);
    queueResult([leadRow]);
    const outcome = await cancelBooking({
      token,
      catalogue,
      now: new Date("2026-08-15T18:00:00Z"),
    });
    expect(outcome.status).toBe("too-late");
    expect(refundCreate).not.toHaveBeenCalled();
  });

  it("does not refund twice when two taps race — the loser claims nothing", async () => {
    queueResult([bookingRow()]);
    queueResult([leadRow]);
    // The guarded update matches no `confirmed` row: the other tap won.
    queueResult([]);

    const outcome = await cancelBooking({ token, catalogue, now: WELL_BEFORE });
    expect(outcome.status).toBe("unavailable");
    expect(refundCreate).not.toHaveBeenCalled();
  });

  it("puts the booking back when the refund fails", async () => {
    queueHappyPath();
    queueResult([]); // the rollback update
    refundCreate.mockRejectedValue(new Error("card network is down"));

    const outcome = await cancelBooking({ token, catalogue, now: WELL_BEFORE });
    expect(outcome.status).toBe("failed");

    // The guest still holds a confirmed booking and a working link.
    const rollback = lastSetPayload()!;
    expect(rollback.status).toBe("confirmed");
    expect(rollback.cancelledAt).toBeNull();
    expect(rollback.cancelledVia).toBeNull();
    expect(rollback.cancellationTokenHash).toBe(bookingRow().cancellationTokenHash);

    // Nothing is announced for something that did not happen.
    expect(sendEmail).not.toHaveBeenCalled();
    expect(recordAuditOrWarn).not.toHaveBeenCalled();
  });

  it("refuses rather than freeing a seat it cannot refund", async () => {
    // No Stripe in this deployment: marking the booking refunded would give
    // the car away and keep the money.
    stripeConfigured = false;
    queueResult([bookingRow()]);
    queueResult([leadRow]);

    const outcome = await cancelBooking({ token, catalogue, now: WELL_BEFORE });
    expect(outcome.status).toBe("failed");
    expect(calls.some((call) => call.method === "update")).toBe(false);
  });

  it("refuses a booking with no payment intent to refund against", async () => {
    queueResult([bookingRow({ stripePaymentIntentId: null })]);
    queueResult([leadRow]);

    const outcome = await cancelBooking({ token, catalogue, now: WELL_BEFORE });
    expect(outcome.status).toBe("failed");
    expect(refundCreate).not.toHaveBeenCalled();
  });

  it("reports an unusable link as unavailable, saying nothing about why", async () => {
    queueResult([]);
    const outcome = await cancelBooking({ token, catalogue, now: WELL_BEFORE });
    expect(outcome).toEqual({ status: "unavailable" });
  });
});
