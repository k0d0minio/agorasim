import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Booking } from "@/db";

/**
 * The payment link at its edges: which state a link's page is in, the session
 * a tap opens (one line, the fee, the 30-minute hold), the departure re-check
 * that refuses a full morning, and the earlier sessions a tap must reuse or
 * must not replace.
 *
 * Stripe is a stand-in whose calls are asserted. The database answers each
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
// Stripe, the departure check and the catalogue.
// ---------------------------------------------------------------------------

const sessionsCreate = vi.fn();
const sessionsRetrieve = vi.fn();
const sessionsExpire = vi.fn();
let connectedAccount: string | null = null;

vi.mock("@/lib/stripe", () => ({
  isStripeConfigured: () => true,
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

const checkSlotAvailable = vi.fn();
vi.mock("@/lib/availability", async () => {
  const actual =
    await vi.importActual<typeof import("@/lib/availability")>("@/lib/availability");
  return { ...actual, checkSlotAvailable: (...args: unknown[]) => checkSlotAvailable(...args) };
});

vi.mock("@/lib/bookings", async () => {
  const actual = await vi.importActual<typeof import("@/lib/bookings")>("@/lib/bookings");
  return {
    ...actual,
    slotOccupancyOn: vi.fn(async () => ({
      drivers: 0,
      vehicles: { "classic-small": 0, "classic-van": 0, touring: 0 },
    })),
  };
});

vi.mock("@/lib/experience-catalogue", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/experience-catalogue")>()),
  listCatalogue: vi.fn(async () => [
    { slug: "rural-saloia", title: { pt: "Rural Saloia", en: "Rural Saloia" } },
  ]),
}));

vi.mock("@/lib/site-origin", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/site-origin")>()),
  siteUrl: () => "https://agorasim.example",
}));
const recordAuditOrWarn = vi.fn();
vi.mock("@/lib/audit", () => ({
  recordAuditOrWarn: (...args: unknown[]) => recordAuditOrWarn(...args),
}));
const sendLoggedEmail = vi.fn();
const paymentReminderLog = vi.fn();
vi.mock("@/lib/message-log", () => ({
  sendLoggedEmail: (...args: unknown[]) => sendLoggedEmail(...args),
  paymentReminderLog: (...args: unknown[]) => paymentReminderLog(...args),
}));
let emailConfigured = true;
vi.mock("@/lib/email", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/email")>()),
  isEmailConfigured: () => emailConfigured,
}));
vi.mock("@/lib/observability", () => ({ captureAlert: vi.fn(), captureError: vi.fn() }));

// The departure lock, as a recorder: which departure each call held, and the
// writes made while it was held. `fail` makes it throw, as a lock wait that
// ran out does. `lib/departure-lock.test.ts` proves the lock itself.
const lock = {
  inside: false,
  fail: false,
  held: [] as { departure: string; writes: string[] }[],
};
vi.mock("@/lib/departure-lock", () => ({
  withDepartureLock: async (date: string, slot: string, run: () => Promise<unknown>) => {
    if (lock.fail) throw new Error("canceling statement due to lock timeout");
    const entry = { departure: `${date}:${slot}`, writes: [] as string[] };
    lock.held.push(entry);
    const before = writes.length;
    lock.inside = true;
    try {
      return await run();
    } finally {
      lock.inside = false;
      entry.writes = writes.slice(before).map((write) => write.op);
    }
  },
}));

process.env.BOOKING_TOKEN_SECRET = "test-secret-for-payment-links";

const { paymentLinkPath, paymentLinkState, sendPaymentReminder, startPaymentLinkCheckout } =
  await import("./payment-link");
const { issueCancellationToken } = await import("@/lib/cancellation-token");
const { commissionOn } = await import("@/lib/commission");
const { BOOKING_HOLD_MINUTES, CHECKOUT_SESSION_MINUTES } = await import("@/lib/bookings");

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const BOOKING_ID = "aaaaaaaa-1111-4111-8111-111111111111";
const LEAD_ID = "bbbbbbbb-2222-4222-8222-222222222222";
const SESSION_ID = "cs_test_link1234";
const NOW = new Date();

/** A link booking two weeks out, not held, as "Enviar link" writes it. */
function linkBooking(overrides: Partial<Booking> = {}): Booking {
  return {
    id: BOOKING_ID,
    tourRequestId: LEAD_ID,
    date: new Date(NOW.getTime() + 14 * 86_400_000).toISOString().slice(0, 10),
    slot: "morning",
    moveSeq: 0,
    experienceSlug: "rural-saloia",
    addOns: [],
    mode: "private",
    adults: 2,
    children: 0,
    infants: 0,
    vehicleClass: "classic-small",
    sharedCarId: null,
    partySize: 2,
    amountCents: 34_000,
    currency: "eur",
    priceBreakdown: [],
    status: "pending",
    locale: "pt",
    stripeSessionId: null,
    stripePaymentIntentId: null,
    paymentMethod: "stripe",
    holdExpiresAt: new Date(NOW.getTime() - 60_000),
    confirmedAt: null,
    cancelledAt: null,
    cancelledVia: null,
    noShowAt: null,
    cancellationTokenHash: null,
    paymentLinkTokenHash: "hmac-sha256$placeholder",
    paymentLinkSentAt: NOW,
    ...overrides,
  } as Booking;
}

const lead = { id: LEAD_ID, name: "Marta", email: "marta@example.pt" };

let token: string;

beforeEach(async () => {
  answers = [];
  writes.length = 0;
  sessionsCreate.mockReset();
  sessionsRetrieve.mockReset();
  sessionsExpire.mockReset();
  checkSlotAvailable.mockReset();
  recordAuditOrWarn.mockReset();
  sendLoggedEmail.mockReset();
  sendLoggedEmail.mockResolvedValue({ status: "sent", providerMessageId: "re_test" });
  paymentReminderLog.mockReset();
  paymentReminderLog.mockResolvedValue(new Map());
  emailConfigured = true;
  connectedAccount = null;
  lock.held = [];
  lock.fail = false;
  token = (await issueCancellationToken()).token;
});

describe("paymentLinkPath", () => {
  it("lives under /reservar, the payment route Stripe's form is allowed on", () => {
    expect(paymentLinkPath("en", "abc")).toBe("/en/reservar/pagar/abc");
  });
});

describe("paymentLinkState", () => {
  it("is payable while the link booking waits and its day is ahead", () => {
    expect(paymentLinkState(linkBooking(), NOW)).toBe("payable");
  });

  it("is paid once confirmed, and stays so after a refund", () => {
    expect(paymentLinkState(linkBooking({ status: "confirmed" }), NOW)).toBe("paid");
    expect(paymentLinkState(linkBooking({ status: "refunded" }), NOW)).toBe("paid");
  });

  it("is closed when the team cancelled it, or its day is past", () => {
    expect(paymentLinkState(linkBooking({ status: "cancelled" }), NOW)).toBe("closed");
    expect(paymentLinkState(linkBooking({ date: "2020-01-01" }), NOW)).toBe("closed");
  });
});

describe("startPaymentLinkCheckout", () => {
  it("refuses a departure that filled since the link went, before any money moves", async () => {
    answers.push([linkBooking()], [lead]);
    checkSlotAvailable.mockResolvedValue({ ok: false, reason: "no-vehicle" });

    const outcome = await startPaymentLinkCheckout({ token, locale: "pt" });

    expect(outcome).toEqual({ status: "full" });
    expect(sessionsCreate).not.toHaveBeenCalled();
    // No hold was claimed for a car that is not there.
    expect(writes).toEqual([]);
  });

  it("holds the car for one session and opens Stripe's form for the agreed total", async () => {
    connectedAccount = "acct_test_agorasim";
    const held = linkBooking();
    answers.push([held], [lead], [held], []);
    checkSlotAvailable.mockResolvedValue({
      ok: true,
      vehicleClass: "classic-small",
      sharedCarId: null,
    });
    sessionsCreate.mockResolvedValue({
      id: SESSION_ID,
      client_secret: `${SESSION_ID}_secret_x`,
    });

    const outcome = await startPaymentLinkCheckout({ token, locale: "en" });

    expect(outcome).toEqual({
      status: "embedded",
      clientSecret: `${SESSION_ID}_secret_x`,
      stripeAccount: "acct_test_agorasim",
    });
    expect(checkSlotAvailable).toHaveBeenCalledWith(
      expect.objectContaining({ partySize: 2, mode: "private", audience: "team" }),
    );

    const [params, options] = sessionsCreate.mock.calls[0];
    expect(params.ui_mode).toBe("embedded_page");
    // One line: an agreed discount cannot be a negative Stripe line.
    expect(params.line_items).toHaveLength(1);
    expect(params.line_items[0].price_data.unit_amount).toBe(34_000);
    expect(params.payment_intent_data.application_fee_amount).toBe(
      commissionOn("tour", 34_000).feeCents,
    );
    expect(params.return_url).toBe(
      "https://agorasim.example/en/reservar/confirmacao?session_id={CHECKOUT_SESSION_ID}",
    );
    expect(options).toEqual({ stripeAccount: "acct_test_agorasim" });

    // The hold lasts BOOKING_HOLD_MINUTES; the session lasts Stripe's
    // shortest expiry, CHECKOUT_SESSION_MINUTES (JAM-291).
    const hold = writes.find(
      (write) => (write.values as { holdExpiresAt?: Date }).holdExpiresAt,
    )?.values as { holdExpiresAt: Date };
    expect(params.expires_at - Math.floor(hold.holdExpiresAt.getTime() / 1000)).toBe(
      (CHECKOUT_SESSION_MINUTES - BOOKING_HOLD_MINUTES) * 60,
    );
    expect(writes).toContainEqual({
      op: "update",
      values: expect.objectContaining({ stripeSessionId: SESSION_ID }),
    });
  });

  it("re-checks and claims the hold under the departure's lock, and calls Stripe after it", async () => {
    const held = linkBooking();
    answers.push([held], [lead], [held], []);
    let checkedInside = false;
    checkSlotAvailable.mockImplementation(async () => {
      checkedInside = lock.inside;
      return { ok: true, vehicleClass: "classic-small", sharedCarId: null };
    });
    let stripeInside = true;
    sessionsCreate.mockImplementation(async () => {
      stripeInside = lock.inside;
      return { id: SESSION_ID, client_secret: `${SESSION_ID}_secret_x` };
    });

    const outcome = await startPaymentLinkCheckout({ token, locale: "en" });

    expect(outcome.status).toBe("embedded");
    expect(checkedInside).toBe(true);
    expect(stripeInside).toBe(false);
    expect(lock.held).toEqual([{ departure: `${held.date}:${held.slot}`, writes: ["update"] }]);
  });

  it("fails before any hold or money when the departure cannot be held", async () => {
    lock.fail = true;
    const quiet = vi.spyOn(console, "error").mockImplementation(() => {});
    answers.push([linkBooking()], [lead]);

    const outcome = await startPaymentLinkCheckout({ token, locale: "pt" });

    expect(outcome).toEqual({ status: "failed" });
    expect(checkSlotAvailable).not.toHaveBeenCalled();
    expect(writes).toEqual([]);
    expect(sessionsCreate).not.toHaveBeenCalled();
    quiet.mockRestore();
  });

  it("hands back an open session under a live hold instead of holding a second car", async () => {
    const live = new Date(Date.now() + 600_000);
    answers.push([linkBooking({ stripeSessionId: SESSION_ID, holdExpiresAt: live })], [lead]);
    sessionsRetrieve.mockResolvedValue({
      id: SESSION_ID,
      status: "open",
      client_secret: `${SESSION_ID}_secret_y`,
    });

    const outcome = await startPaymentLinkCheckout({ token, locale: "pt" });

    expect(outcome).toMatchObject({ status: "embedded", clientSecret: `${SESSION_ID}_secret_y` });
    expect(sessionsCreate).not.toHaveBeenCalled();
    expect(checkSlotAvailable).not.toHaveBeenCalled();
  });

  it("never replaces a session a delayed payment completed", async () => {
    answers.push([linkBooking({ stripeSessionId: SESSION_ID })], [lead]);
    sessionsRetrieve.mockResolvedValue({
      id: SESSION_ID,
      status: "complete",
      payment_status: "unpaid",
    });

    const outcome = await startPaymentLinkCheckout({ token, locale: "pt" });

    expect(outcome).toEqual({ status: "awaiting" });
    expect(sessionsCreate).not.toHaveBeenCalled();
  });

  it("says nothing about a token it does not know", async () => {
    answers.push([]);

    expect(await startPaymentLinkCheckout({ token, locale: "pt" })).toEqual({
      status: "not-found",
    });
  });
});

/** A site checkout the guest left: no link, and the Stripe session closed it. */
function unpaidCheckout(overrides: Partial<Booking> = {}): Booking {
  return linkBooking({
    status: "expired",
    mode: "public",
    stripeSessionId: SESSION_ID,
    paymentLinkTokenHash: null,
    paymentLinkSentAt: null,
    ...overrides,
  });
}

/** The row "Lembrar" wrote, as the update hands it back. */
function reminded(booking: Booking): Booking {
  return {
    ...booking,
    status: "pending",
    paymentLinkTokenHash: "hmac-sha256$new",
    paymentLinkSentAt: new Date(),
  };
}

describe("sendPaymentReminder", () => {
  it("reopens an expired checkout as a link booking and emails the guest a new link", async () => {
    const booking = unpaidCheckout();
    answers.push([booking], [lead], [{ id: BOOKING_ID }], [reminded(booking)]);

    const outcome = await sendPaymentReminder({ bookingId: BOOKING_ID, actorUserId: "user-1" });

    expect(outcome).toEqual({ status: "sent" });

    // One write: pending again, with a link, and holding no car.
    expect(writes).toHaveLength(1);
    const written = writes[0].values as {
      status: string;
      paymentLinkTokenHash: string;
      paymentLinkSentAt: Date;
      holdExpiresAt: Date;
    };
    expect(written.status).toBe("pending");
    expect(written.paymentLinkTokenHash).toEqual(expect.any(String));
    expect(written.holdExpiresAt.getTime()).toBeLessThanOrEqual(Date.now());

    // One email of the new kind, keyed on this send, with the facts and the link.
    expect(sendLoggedEmail).toHaveBeenCalledTimes(1);
    const [subject, message] = sendLoggedEmail.mock.calls[0];
    expect(subject).toEqual({
      kind: "booking-payment-reminder",
      recipient: "guest",
      bookingId: BOOKING_ID,
      tourRequestId: LEAD_ID,
      linkSentAt: written.paymentLinkSentAt,
    });
    expect(message.to).toEqual(["marta@example.pt"]);
    expect(message.subject).toContain("A sua reserva ficou por pagar");
    expect(message.subject).toContain("Rural Saloia");
    expect(message.text).toContain("Começou uma reserva connosco");
    expect(message.text).toMatch(/2 (pessoas|adultos)/);
    expect(message.text).toMatch(/340/);
    expect(message.text).toMatch(
      /https:\/\/agorasim\.example\/pt\/reservar\/pagar\/[A-Za-z0-9_-]+/,
    );
    // Not the mail of a booking the team registered.
    expect(message.text).not.toContain("Obrigado pelo contacto");

    // The audit log names the reminder and who sent it, and never the link.
    expect(recordAuditOrWarn).toHaveBeenCalledTimes(1);
    const audit = recordAuditOrWarn.mock.calls[0][0];
    expect(audit).toMatchObject({
      actorUserId: "user-1",
      action: "booking.payment_reminder_sent",
      entityType: "booking",
      entityId: BOOKING_ID,
      before: { status: "expired" },
      after: { status: "pending", email: "sent" },
    });
    expect(JSON.stringify(audit)).not.toContain(written.paymentLinkTokenHash);
  });

  it("writes the email in the booking's language", async () => {
    const booking = unpaidCheckout({ locale: "en" });
    answers.push([booking], [lead], [{ id: BOOKING_ID }], [reminded(booking)]);

    await sendPaymentReminder({ bookingId: BOOKING_ID, actorUserId: "user-1" });

    const [, message] = sendLoggedEmail.mock.calls[0];
    expect(message.subject).toContain("Your booking is not paid yet");
    expect(message.text).toContain("You started a booking with us");
    expect(message.text).toContain("https://agorasim.example/en/reservar/pagar/");
  });

  it("reminds a checkout that is still pending once its hold has lapsed", async () => {
    const booking = unpaidCheckout({ status: "pending" });
    answers.push([booking], [lead], [{ id: BOOKING_ID }], [reminded(booking)]);

    expect(
      await sendPaymentReminder({ bookingId: BOOKING_ID, actorUserId: "user-1" }),
    ).toEqual({ status: "sent" });
  });

  it("reminds again a booking it reminded before, with a newer link", async () => {
    const booking = reminded(unpaidCheckout());
    paymentReminderLog.mockResolvedValue(
      new Map([[BOOKING_ID, { sent: 1, lastSentAt: new Date() }]]),
    );
    answers.push([booking], [lead], [{ id: BOOKING_ID }], [reminded(booking)]);

    expect(
      await sendPaymentReminder({ bookingId: BOOKING_ID, actorUserId: "user-1" }),
    ).toEqual({ status: "sent" });
    expect(sendLoggedEmail).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["a paid booking", unpaidCheckout({ status: "confirmed" }), "paid"],
    ["a cancelled booking", unpaidCheckout({ status: "cancelled" }), "closed"],
    ["a departure that is past", unpaidCheckout({ date: "2020-01-01" }), "past"],
    [
      "a guest on the payment form now",
      unpaidCheckout({ status: "pending", holdExpiresAt: new Date(Date.now() + 600_000) }),
      "in-checkout",
    ],
    ["a link the team registered", linkBooking(), "team-link"],
  ] as const)("refuses %s, and writes and sends nothing", async (_name, booking, reason) => {
    answers.push([booking]);

    const outcome = await sendPaymentReminder({ bookingId: BOOKING_ID, actorUserId: "user-1" });

    expect(outcome).toEqual({ status: "not-remindable", reason });
    expect(writes).toEqual([]);
    expect(sendLoggedEmail).not.toHaveBeenCalled();
    expect(recordAuditOrWarn).not.toHaveBeenCalled();
  });

  it("refuses a lead with no email, and an anonymised lead", async () => {
    answers.push([unpaidCheckout()], [{ ...lead, email: null }]);
    expect(
      await sendPaymentReminder({ bookingId: BOOKING_ID, actorUserId: "user-1" }),
    ).toEqual({ status: "not-remindable", reason: "no-email" });

    answers.push([unpaidCheckout()], [{ ...lead, anonymisedAt: new Date() }]);
    expect(
      await sendPaymentReminder({ bookingId: BOOKING_ID, actorUserId: "user-1" }),
    ).toEqual({ status: "not-remindable", reason: "no-email" });

    expect(writes).toEqual([]);
    expect(sendLoggedEmail).not.toHaveBeenCalled();
  });

  it("refuses a booking that is not the lead's newest", async () => {
    answers.push([unpaidCheckout()], [lead], [{ id: "cccccccc-3333-4333-8333-333333333333" }]);

    expect(
      await sendPaymentReminder({ bookingId: BOOKING_ID, actorUserId: "user-1" }),
    ).toEqual({ status: "not-remindable", reason: "superseded" });
    expect(writes).toEqual([]);
    expect(sendLoggedEmail).not.toHaveBeenCalled();
  });

  it("changes nothing on a deployment that cannot send email", async () => {
    emailConfigured = false;

    expect(
      await sendPaymentReminder({ bookingId: BOOKING_ID, actorUserId: "user-1" }),
    ).toEqual({ status: "unconfigured" });
    expect(writes).toEqual([]);
  });

  it("says so when the email did not go, and still records the reminder", async () => {
    const quiet = vi.spyOn(console, "error").mockImplementation(() => {});
    const booking = unpaidCheckout();
    answers.push([booking], [lead], [{ id: BOOKING_ID }], [reminded(booking)]);
    sendLoggedEmail.mockResolvedValue({ status: "failed", reason: "failed" });

    expect(
      await sendPaymentReminder({ bookingId: BOOKING_ID, actorUserId: "user-1" }),
    ).toEqual({ status: "email-failed" });
    expect(recordAuditOrWarn.mock.calls[0][0]).toMatchObject({
      action: "booking.payment_reminder_sent",
      after: { email: "failed" },
    });
    quiet.mockRestore();
  });

  it("leaves a link that refuses payment when the departure has no seat left", async () => {
    // The booking as a reminder leaves it: pending, with a link, no hold, and
    // the closed Stripe session of the checkout the guest left.
    answers.push([reminded(unpaidCheckout())], [lead]);
    sessionsRetrieve.mockResolvedValue({ id: SESSION_ID, status: "expired" });
    checkSlotAvailable.mockResolvedValue({ ok: false, reason: "no-vehicle" });

    const outcome = await startPaymentLinkCheckout({ token, locale: "pt" });

    expect(outcome).toEqual({ status: "full" });
    expect(sessionsCreate).not.toHaveBeenCalled();
    expect(writes).toEqual([]);
  });
});

describe("the public checkout", () => {
  it("offers no cash option: its form has no payment choice and its copy no cash", async () => {
    const { bookingCheckoutSchema } = await import("@/lib/form-schemas");
    const { bookingContent } = await import("@/content/booking");

    expect(Object.keys(bookingCheckoutSchema.shape)).not.toContain("payment");
    expect(JSON.stringify(bookingContent)).not.toMatch(/dinheiro|\bcash\b/i);
  });
});
