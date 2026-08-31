import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The guest's half of a cancellation — the part that is *not* shared with the
 * Sales board.
 *
 * Claiming the row, refunding the charge and freeing the seat all live in
 * `lib/booking-refund.ts` and are tested against the admin action, so this file
 * deliberately mocks that engine out and asserts only what the guest path adds:
 *
 * 1. **The token is the authentication.** It is looked up by digest, never by
 *    the token itself, and a shape that is not a token costs no query.
 * 2. **The 48-hour gate.** It is the guest path's alone — Rita cancelling by
 *    hand is not bound by a promise made to the person on the phone — so
 *    inside the window the engine must never be reached at all.
 * 3. **The link is single-use**, and spent after a successful cancellation.
 * 4. **The team gets told**, which the shared engine leaves to its callers.
 * 5. **A dead link says nothing** about whether a booking is behind it.
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

/**
 * The shared engine, mocked. Its own behaviour — the guarded claim, the Stripe
 * call, the audit row — is `app/admin/actions.test.ts`'s subject; what matters
 * here is *whether and how* the guest path calls it.
 */
const cancelAndRefundBooking =
  vi.fn<(options: Record<string, unknown>) => Promise<Record<string, unknown>>>();

vi.mock("@/lib/booking-refund", async () => {
  const actual =
    await vi.importActual<typeof import("@/lib/booking-refund")>("@/lib/booking-refund");
  return {
    // The real predicates: "still cancellable" and "how much is left" must be
    // the same answers the Sales board gets, not a second opinion.
    isCancellable: actual.isCancellable,
    refundableCents: actual.refundableCents,
    cancelAndRefundBooking: (options: Record<string, unknown>) =>
      cancelAndRefundBooking(options),
  };
});

const sendEmail = vi.fn<(message: unknown) => Promise<{ sent: true }>>(async () => ({
  sent: true as const,
}));
vi.mock("@/lib/email", () => ({
  isEmailConfigured: () => true,
  sendEmail: (message: unknown) => sendEmail(message),
  teamRecipients: () => ["diogo@agorasim.pt"],
}));

vi.mock("@/lib/experience-catalogue", () => ({ listCatalogue: async () => [] }));

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
    refundedAmountCents: 0,
    stripeRefundId: null,
    refundedAt: null,
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

function setPayloads(): Record<string, unknown>[] {
  return calls
    .filter((call) => call.method === "set")
    .map((call) => call.args[0] as Record<string, unknown>);
}

let token: string;

beforeEach(async () => {
  calls = [];
  results = [];
  sendEmail.mockClear();
  cancelAndRefundBooking.mockReset();
  cancelAndRefundBooking.mockResolvedValue({
    status: "cancelled",
    booking: bookingRow({ status: "refunded", refundedAmountCents: 34000 }),
    refundedCents: 34000,
  });

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
  /** Queue the two reads `resolveCancellation` makes, then the token-spend write. */
  function queueLookup() {
    queueResult([bookingRow()]); // the booking, by digest
    queueResult([leadRow]); // its lead
    queueResult([]); // the token-spend update
  }

  it("hands the whole job to the shared engine, as the guest", async () => {
    queueLookup();

    const outcome = await cancelBooking({ token, catalogue, now: WELL_BEFORE });
    expect(outcome.status).toBe("cancelled");

    expect(cancelAndRefundBooking).toHaveBeenCalledTimes(1);
    const options = cancelAndRefundBooking.mock.calls[0][0];
    expect(options.bookingId).toBe(bookingRow().id);
    expect(options.via).toBe("guest");
    // Nobody in the admin pressed this; the token was the authority.
    expect(options.actorUserId).toBeNull();
  });

  it("returns everything still refundable, not the sticker price", async () => {
    // The team already gave €100 back by hand. "Free cancellation" is the rest
    // of it — refunding the full €340 would return that €100 twice.
    queueResult([bookingRow({ refundedAmountCents: 10000 })]);
    queueResult([leadRow]);
    queueResult([]);

    await cancelBooking({ token, catalogue, now: WELL_BEFORE });
    expect(cancelAndRefundBooking.mock.calls[0][0].refundCents).toBe(24000);
  });

  it("spends the token, so the link works exactly once", async () => {
    queueLookup();
    await cancelBooking({ token, catalogue, now: WELL_BEFORE });

    const spend = setPayloads().at(-1)!;
    expect(spend.cancellationTokenHash).toBeNull();
  });

  it("tells the team a seat came free — the engine leaves that to us", async () => {
    queueLookup();
    await cancelBooking({ token, catalogue, now: WELL_BEFORE });

    expect(sendEmail).toHaveBeenCalledTimes(1);
    const message = sendEmail.mock.calls[0][0] as { subject: string; text: string };
    expect(message.subject).toContain("Reserva cancelada");
    expect(message.text).toContain("Lugar libertado");
  });

  it("refuses inside 48 hours without going near the engine", async () => {
    queueResult([bookingRow()]);
    queueResult([leadRow]);

    const outcome = await cancelBooking({ token, catalogue, now: TOO_CLOSE });
    expect(outcome.status).toBe("too-late");
    expect(cancelAndRefundBooking).not.toHaveBeenCalled();
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
    expect(cancelAndRefundBooking).not.toHaveBeenCalled();
  });

  it("reports a lost race as unavailable — the Sales board or another tap won", async () => {
    queueLookup();
    cancelAndRefundBooking.mockResolvedValue({
      status: "not-cancellable",
      booking: bookingRow({ status: "cancelled" }),
    });

    const outcome = await cancelBooking({ token, catalogue, now: WELL_BEFORE });
    expect(outcome.status).toBe("unavailable");
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("reports a refused refund as failed, and announces nothing", async () => {
    queueLookup();
    cancelAndRefundBooking.mockResolvedValue({
      status: "refund-failed",
      booking: bookingRow({ status: "cancelled" }),
      message: "card network is down",
    });

    const outcome = await cancelBooking({ token, catalogue, now: WELL_BEFORE });
    expect(outcome.status).toBe("failed");
    // The engine already mailed the guest; the team notice is for a seat that
    // came free cleanly, which this is not.
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("reports an unusable link as unavailable, saying nothing about why", async () => {
    queueResult([]);
    const outcome = await cancelBooking({ token, catalogue, now: WELL_BEFORE });
    expect(outcome).toEqual({ status: "unavailable" });
    expect(cancelAndRefundBooking).not.toHaveBeenCalled();
  });
});
