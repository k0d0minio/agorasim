import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Booking } from "@/db";

/**
 * The tour's cancel-and-refund ({@link cancelAndRefundBooking}) as Stripe sees
 * it: which request it is asked, under which idempotency key, and how often.
 *
 * The key is the claim's — the booking and the moment it was claimed — so it
 * names the attempt rather than the row: a key a later attempt could share
 * would be handed the decline Stripe keeps against it for a day. A double
 * submit never reaches Stripe twice, because the claim lets one caller through.
 */

// ---------------------------------------------------------------------------
// A fake Neon client — chainable, resolving each query to the next queued
// result, in the shape `booking-move.test.ts` uses.
// ---------------------------------------------------------------------------

let results: unknown[] = [];

function queueResults(...values: unknown[]): void {
  results.push(...values);
}

function makeQuery(): unknown {
  const proxy: unknown = new Proxy(
    {},
    {
      get(_target, prop) {
        if (prop === "then") {
          const value = results.length > 0 ? results.shift() : [];
          return (onFulfilled?: (value: unknown) => unknown) =>
            Promise.resolve(value).then(onFulfilled);
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

const intentsRetrieve = vi.fn();
const refundsCreate = vi.fn();

vi.mock("@/lib/stripe", () => ({
  isStripeConfigured: () => true,
  onOwningAccount: (run: (options?: unknown) => unknown) =>
    run({ stripeAccount: "acct_test_agorasim" }),
  stripe: () => ({
    paymentIntents: { retrieve: (...args: unknown[]) => intentsRetrieve(...args) },
    refunds: { create: (...args: unknown[]) => refundsCreate(...args) },
  }),
}));

const recordAuditOrWarn = vi.fn();
vi.mock("@/lib/audit", () => ({
  recordAuditOrWarn: (...args: unknown[]) => recordAuditOrWarn(...args),
}));

// No mail: the guest's notice is not what this file is about.
vi.mock("@/lib/email", () => ({ isEmailConfigured: () => false }));
vi.mock("@/lib/experience-catalogue", () => ({ listCatalogue: async () => [] }));
vi.mock("@/lib/message-log", () => ({ sendLoggedEmail: vi.fn() }));

// Dynamic, after the mocks — a static import would reach the mocked `@/db`
// before this file's own `const`s exist.
const { cancelAndRefundBooking } = await import("./booking-refund");

// ---------------------------------------------------------------------------
// Fixtures — a €340 tour, paid in full on a connected account.
// ---------------------------------------------------------------------------

const BOOKING_ID = "aaaaaaaa-1111-4111-8111-111111111111";
const ADMIN_ID = "eeeeeeee-5555-4555-8555-555555555555";
/** The moment the claim landed — what the key is made of. */
const CLAIMED_AT = new Date("2026-09-30T14:03:27.512Z");

function booking(overrides: Partial<Booking> = {}): Booking {
  return {
    id: BOOKING_ID,
    status: "confirmed",
    amountCents: 34_000,
    refundedAmountCents: 0,
    currency: "eur",
    stripePaymentIntentId: "pi_tour",
    stripeRefundId: null,
    tourRequestId: null,
    cancelledAt: null,
    cancelledVia: null,
    refundedAt: null,
    date: "2026-10-12",
    ...overrides,
  } as Booking;
}

const claimed = () => booking({ status: "cancelled", cancelledAt: CLAIMED_AT, cancelledVia: "admin" });
const settled = () =>
  booking({
    status: "refunded",
    cancelledAt: CLAIMED_AT,
    cancelledVia: "admin",
    refundedAmountCents: 34_000,
    stripeRefundId: "re_tour",
  });

beforeEach(() => {
  vi.resetAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  results = [];
  intentsRetrieve.mockResolvedValue({
    id: "pi_tour",
    latest_charge: { id: "ch_tour", application_fee_amount: 1_360 },
  });
  refundsCreate.mockResolvedValue({ id: "re_tour", amount: 34_000, status: "succeeded" });
});

describe("cancelAndRefundBooking — the refund is keyed on the claim", () => {
  it("asks Stripe under the claimed row's booking and claim moment", async () => {
    // The read, the claim, the settling write.
    queueResults([booking()], [claimed()], [settled()]);

    const outcome = await cancelAndRefundBooking({
      bookingId: BOOKING_ID,
      refundCents: 34_000,
      via: "admin",
      actorUserId: ADMIN_ID,
    });

    expect(outcome).toMatchObject({ status: "cancelled", refundedCents: 34_000 });
    expect(refundsCreate).toHaveBeenCalledTimes(1);
    expect(refundsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        payment_intent: "pi_tour",
        amount: 34_000,
        refund_application_fee: true,
      }),
      {
        stripeAccount: "acct_test_agorasim",
        // The claim, and nothing about the amount or what went back before.
        idempotencyKey: `booking-refund:${BOOKING_ID}:${CLAIMED_AT.getTime()}`,
      },
    );
  });

  it("never reaches Stripe a second time for a double submit", async () => {
    queueResults(
      // The first submit: read, claim, settle.
      [booking()],
      [claimed()],
      [settled()],
      // The second read the row before the first's claim landed — and its own
      // claim finds nothing left to update.
      [booking()],
      [],
      // A third, later still, reads the booking already over.
      [settled()],
    );
    const submit = () =>
      cancelAndRefundBooking({
        bookingId: BOOKING_ID,
        refundCents: 34_000,
        via: "admin",
        actorUserId: ADMIN_ID,
      });

    expect(await submit()).toMatchObject({ status: "cancelled" });
    expect(await submit()).toMatchObject({ status: "not-cancellable" });
    expect(await submit()).toMatchObject({ status: "not-cancellable" });

    expect(refundsCreate).toHaveBeenCalledTimes(1);
    expect(intentsRetrieve).toHaveBeenCalledTimes(1);
  });
});
