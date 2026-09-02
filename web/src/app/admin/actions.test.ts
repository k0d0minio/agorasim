import { beforeEach, describe, expect, it, vi } from "vitest";

import { createSessionToken } from "@/lib/admin-session";
import type { AdminUserSummary } from "@/lib/admin-users";

/**
 * End-to-end-ish coverage of the two properties the admin actions exist to
 * guarantee, exercised through the real actions rather than around them:
 *
 * 1. **Role enforcement is in the action.** A collaborator hitting an
 *    owner-only action is stopped before it touches the database, whatever the
 *    UI did or did not render.
 * 2. **Every mutation names an actor.** The audit entry is written by the real
 *    `lib/audit.ts` writer, so what is asserted here is what a row would
 *    actually contain.
 *
 * Only the edges are faked: the request's cookies, Next's `redirect`, the Neon
 * client, and the account store. The schema is the real one, so `eq()`/
 * `inArray()` build real SQL against real columns.
 */

// ---------------------------------------------------------------------------
// A fake Neon client: chainable, and resolving to whatever the test queued.
// ---------------------------------------------------------------------------

type QueryCall = { method: string; args: unknown[] };

/** Every builder method called this test, in order. */
let calls: QueryCall[] = [];
/** FIFO of results (or errors) for each awaited query, oldest first. */
let results: unknown[] = [];

function queueResult(value: unknown): void {
  results.push(value);
}

function nextResult(): unknown {
  return results.length > 0 ? results.shift() : [];
}

/** A drizzle-shaped query builder: any method chains, awaiting resolves. */
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
  // The real schema, so column references and SQL building are genuine.
  const schema = await vi.importActual<typeof import("@/db/schema")>("@/db/schema");
  return { ...schema, db: fakeDb };
});

// ---------------------------------------------------------------------------
// Request-bound edges
// ---------------------------------------------------------------------------

const cookieJar = new Map<string, string>();

vi.mock("next/headers", () => ({
  // `requireAdmin` reads these to remember where a lapsed session was when it
  // sends the operator to the login screen.
  headers: async () => new Headers(),
  cookies: async () => ({
    get: (name: string) => {
      const value = cookieJar.get(name);
      return value === undefined ? undefined : { name, value };
    },
    set: (name: string, value: string) => cookieJar.set(name, value),
    delete: (name: string) => cookieJar.delete(name),
  }),
}));

class RedirectError extends Error {
  constructor(readonly to: string) {
    super(`NEXT_REDIRECT:${to}`);
  }
}

vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new RedirectError(to);
  },
}));

vi.mock("@/lib/request-ip", () => ({ clientIp: async () => "203.0.113.9" }));

// The catalogue actions revalidate the public site after a write. There is no
// cache here to bust; what matters is that they call it.
const revalidatePath = vi.fn();
vi.mock("next/cache", () => ({ revalidatePath: (...args: unknown[]) => revalidatePath(...args) }));

// Stripe, for the refund. The action's job is to ask for the right refund and
// to write down what came back; whether Stripe's own API works is not this
// suite's question.
const refundsCreate = vi.fn();
const paymentIntentsRetrieve = vi.fn();

// A whole stand-in for the module, Connect switches included: no connected
// account here, so the account helpers answer as they do on a platform-only
// deployment and `onOwningAccount` is a straight pass-through.
vi.mock("@/lib/stripe", () => ({
  isStripeConfigured: () => true,
  isWebhookConfigured: () => true,
  isTestMode: () => true,
  connectedAccountId: () => null,
  isConnectConfigured: () => false,
  onConnectedAccount: (options?: unknown) => options,
  onOwningAccount: (run: (options?: unknown) => unknown) => run(undefined),
  stripe: () => ({
    paymentIntents: {
      retrieve: (...args: unknown[]) => paymentIntentsRetrieve(...args),
    },
    refunds: { create: (...args: unknown[]) => refundsCreate(...args) },
  }),
}));

// Unconfigured, as in CI: the guest's cancellation mail is best-effort and the
// paths that matter here are the money and the audit row.
vi.mock("@/lib/email", () => ({
  isEmailConfigured: () => false,
  sendEmail: vi.fn(),
  teamRecipients: () => [],
  senderAddress: () => null,
}));

const findAdminUserById = vi.fn<(id: string) => Promise<AdminUserSummary | null>>();

vi.mock("@/lib/admin-users", () => ({
  findAdminUserById: (id: string) => findAdminUserById(id),
  normalizeEmail: (email: string) => email.trim().toLowerCase(),
  // Unused by the actions under test, but imported by the module.
  countActiveOwners: vi.fn(),
  createAdminUser: vi.fn(),
  disableAdminUser: vi.fn(),
  enableAdminUser: vi.fn(),
  ensureSeedOwner: vi.fn(),
  revokeAdminUserSessions: vi.fn(),
  setAdminUserPassword: vi.fn(),
  touchLastLogin: vi.fn(),
  verifyCredentials: vi.fn(),
}));

const { ADMIN_FORBIDDEN_PATH } = await import("@/lib/admin-auth");
const { ADMIN_SESSION_COOKIE } = await import("@/lib/admin-session");
const {
  deleteTourRequest,
  exportSubject,
  logContactAttempt,
  updateTourRequest,
  updateTourRequestStatus,
} = await import("./actions");
const { deleteExperience, saveExperience } = await import("./experiences/actions");
const { cancelBooking } = await import("./sales/actions");

const OWNER_ID = "11111111-1111-4111-8111-111111111111";
const COLLABORATOR_ID = "22222222-2222-4222-8222-222222222222";
const REQUEST_ID = "33333333-3333-4333-8333-333333333333";
const BOOKING_ID = "44444444-4444-4444-8444-444444444444";

function account(role: "owner" | "collaborator"): AdminUserSummary {
  return {
    id: role === "owner" ? OWNER_ID : COLLABORATOR_ID,
    email: role === "owner" ? "rita@agorasim.pt" : "dev@example.com",
    name: role === "owner" ? "Rita" : "Developer",
    role,
    lastLoginAt: null,
    disabledAt: null,
    sessionsValidFrom: new Date("2020-01-01T00:00:00Z"),
    createdAt: new Date("2020-01-01T00:00:00Z"),
  };
}

async function signInAs(role: "owner" | "collaborator"): Promise<void> {
  const user = account(role);
  cookieJar.set(ADMIN_SESSION_COOKIE, await createSessionToken(user.id));
  findAdminUserById.mockResolvedValue(user);
}

/** The `values()` payloads handed to `db.insert(...)`, in order. */
function insertedValues(): Record<string, unknown>[] {
  return calls
    .filter((call) => call.method === "values")
    .map((call) => call.args[0] as Record<string, unknown>);
}

/** The `set()` payloads handed to `db.update(...)`, in order. */
function updatedValues(): Record<string, unknown>[] {
  return calls
    .filter((call) => call.method === "set")
    .map((call) => call.args[0] as Record<string, unknown>);
}

function called(method: string): boolean {
  return calls.some((call) => call.method === method);
}

/** Run `fn`, returning the path it redirected to, or `null` if it did not. */
async function redirectedTo(fn: () => Promise<unknown>): Promise<string | null> {
  try {
    await fn();
    return null;
  } catch (err) {
    if (err instanceof RedirectError) return err.to;
    throw err;
  }
}

function form(values: Record<string, string | string[]>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) {
    for (const item of Array.isArray(value) ? value : [value]) data.append(key, item);
  }
  return data;
}

/** One paid booking, as the lookup before a refund would return it. */
function bookingRow(overrides: Record<string, unknown> = {}) {
  return {
    id: BOOKING_ID,
    tourRequestId: REQUEST_ID,
    date: "2026-08-15",
    slot: "morning",
    experienceSlug: "rural-saloia",
    addOns: [],
    mode: "public",
    adults: 2,
    children: 0,
    infants: 0,
    vehicleClass: "classic-small",
    partySize: 2,
    amountCents: 34000,
    currency: "eur",
    priceBreakdown: [],
    status: "confirmed",
    locale: "pt",
    stripeSessionId: "cs_test_1",
    stripePaymentIntentId: "pi_test_1",
    holdExpiresAt: new Date("2026-06-01T09:30:00Z"),
    confirmedAt: new Date("2026-06-01T09:10:00Z"),
    cancelledAt: null,
    cancelledVia: null,
    cancellationTokenHash: null,
    refundedAmountCents: 0,
    stripeRefundId: null,
    refundedAt: null,
    createdAt: new Date("2026-06-01T09:00:00Z"),
    updatedAt: new Date("2026-06-01T09:10:00Z"),
    ...overrides,
  };
}

/** One enquiry row, as the pre-delete lookup would return it. */
const subjectRow = {
  id: REQUEST_ID,
  email: "ana.silva@example.com",
  name: "Ana Silva",
  status: "new",
  createdAt: new Date("2026-06-01T09:00:00Z"),
};

beforeEach(() => {
  calls = [];
  results = [];
  cookieJar.clear();
  findAdminUserById.mockReset();
  revalidatePath.mockReset();
  refundsCreate.mockReset();
  paymentIntentsRetrieve.mockReset();
  paymentIntentsRetrieve.mockResolvedValue({ latest_charge: null });
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("a collaborator cannot reach owner-only data actions", () => {
  it("is refused when erasing a submission, before any database call", async () => {
    await signInAs("collaborator");

    expect(
      await redirectedTo(() =>
        deleteTourRequest({}, form({ id: REQUEST_ID, confirm: "APAGAR" })),
      ),
    ).toBe(ADMIN_FORBIDDEN_PATH);

    expect(called("delete")).toBe(false);
    expect(called("select")).toBe(false);
  });

  it("is refused when exporting a person's data", async () => {
    await signInAs("collaborator");

    expect(
      await redirectedTo(() => exportSubject({}, form({ email: "ana@example.com" }))),
    ).toBe(ADMIN_FORBIDDEN_PATH);

    expect(called("select")).toBe(false);
  });

});

describe("every mutation lands in the audit log with the right actor", () => {
  it("records a status change against the operator who made it", async () => {
    await signInAs("collaborator");
    queueResult([{ id: REQUEST_ID, status: "contacted" }]);
    queueResult(undefined);

    const result = await updateTourRequestStatus(REQUEST_ID, "contacted");

    expect(result.ok).toBe(true);
    expect(insertedValues()[0]).toEqual({
      actorUserId: COLLABORATOR_ID,
      action: "tour_request.status_changed",
      entityType: "tour_request",
      entityId: REQUEST_ID,
      before: null,
      after: { status: "contacted" },
      ipAddress: "203.0.113.9",
    });
  });

  it("does not report success for a row that no longer exists", async () => {
    await signInAs("owner");
    queueResult([]); // UPDATE matched nothing

    const result = await updateTourRequestStatus(REQUEST_ID, "contacted");

    expect(result.error).toBeTruthy();
    expect(insertedValues()).toHaveLength(0);
  });
});

describe("erasing a submission", () => {
  it("deletes the row and leaves a non-identifying audit entry", async () => {
    await signInAs("owner");
    queueResult([subjectRow]); // the pre-delete lookup
    queueResult(undefined); // the audit insert
    queueResult(undefined); // the delete

    const result = await deleteTourRequest(
      {},
      form({ id: REQUEST_ID, confirm: "APAGAR" }),
    );

    expect(result.ok).toBe(true);
    expect(called("delete")).toBe(true);

    const entry = insertedValues()[0]!;
    expect(entry).toMatchObject({
      actorUserId: OWNER_ID,
      action: "tour_request.deleted",
      entityId: REQUEST_ID,
    });

    // The entry records that an erasure happened, not who it was about.
    const serialized = JSON.stringify(entry.before);
    expect(serialized).not.toContain("ana.silva");
    expect(serialized).not.toContain("Silva");
    expect(serialized).toContain("example.com");
  });

  it("refuses to delete when the audit entry cannot be written", async () => {
    // An untraceable erasure is a worse outcome than a failed one, so the
    // trail is written first and a failure stops the deletion.
    await signInAs("owner");
    queueResult([subjectRow]);
    queueResult(new Error("connection reset"));

    const result = await deleteTourRequest(
      {},
      form({ id: REQUEST_ID, confirm: "APAGAR" }),
    );

    expect(result.error).toBeTruthy();
    expect(called("delete")).toBe(false);
  });

  it("refuses without the typed confirmation", async () => {
    await signInAs("owner");

    const result = await deleteTourRequest({}, form({ id: REQUEST_ID, confirm: "yes" }));

    expect(result.error).toBeTruthy();
    expect(called("delete")).toBe(false);
    expect(called("select")).toBe(false);
  });

  it("no longer accepts the English word the confirmation used to ask for", async () => {
    await signInAs("owner");

    const result = await deleteTourRequest({}, form({ id: REQUEST_ID, confirm: "DELETE" }));

    expect(result.error).toBeTruthy();
    expect(called("delete")).toBe(false);
    expect(called("select")).toBe(false);
  });
});

describe("exporting a person's data", () => {
  it("returns JSON for the owner and records the export", async () => {
    await signInAs("owner");
    queueResult([{ ...subjectRow, message: "Looking for a Saturday in August" }]);
    queueResult(undefined); // the audit insert

    const result = await exportSubject({}, form({ email: "Ana.Silva@example.com" }));

    expect(result.error).toBeUndefined();
    expect(result.filename).toMatch(/^agorasim-data-export-ana-silva-example-com-\d{4}-\d{2}-\d{2}\.json$/);

    const exported = JSON.parse(result.json!);
    expect(exported.subjectEmail).toBe("ana.silva@example.com");
    expect(exported.counts.tourRequests).toBe(1);
    expect(exported.records.tourRequests[0].message).toContain("Saturday in August");

    // The audit entry says an export happened, without repeating the address.
    const entry = insertedValues()[0]!;
    expect(entry.action).toBe("tour_request.exported");
    expect(JSON.stringify(entry.after)).not.toContain("ana.silva");
  });
});

describe("editing a lead from its own page", () => {
  /** The row as the pre-save lookup returns it, before any edit. */
  const leadRow = {
    id: REQUEST_ID,
    name: "Ana Silva",
    email: "ana.silva@example.com",
    phone: null,
    kind: "tour",
    experienceSlug: "rural-saloia",
    addOns: ["manzwine"],
    partySize: 2,
    preferredDate: "15 August",
    message: "Somos dois.",
    internalNotes: null,
    status: "new",
  };

  function edit(overrides: Record<string, string | string[]> = {}): FormData {
    return form({
      id: REQUEST_ID,
      name: leadRow.name,
      email: leadRow.email,
      kind: "tour",
      experienceSlug: "rural-saloia",
      addOns: ["manzwine"],
      partySize: "2",
      preferredDate: "15 August",
      message: "Somos dois.",
      ...overrides,
    });
  }

  it("names the fields that changed, never their values", async () => {
    await signInAs("collaborator");
    queueResult([leadRow]); // the pre-save lookup
    queueResult(undefined); // the update
    queueResult(undefined); // the audit insert

    const result = await updateTourRequest(
      {},
      edit({ partySize: "4", internalNotes: "Wants the 2CV, calling back Thursday." }),
    );

    expect(result.ok).toBe(true);
    const entry = insertedValues()[0]!;
    expect(entry).toMatchObject({
      actorUserId: COLLABORATOR_ID,
      action: "tour_request.updated",
      entityId: REQUEST_ID,
      after: { fields: ["partySize", "internalNotes"] },
    });

    // A log that quoted the note would be a second, less careful copy of the
    // personal data the note is about.
    expect(JSON.stringify(entry.after)).not.toContain("2CV");
  });

  it("writes nothing when nothing actually changed", async () => {
    await signInAs("collaborator");
    queueResult([leadRow]);

    const result = await updateTourRequest({}, edit());

    expect(result.ok).toBe(true);
    expect(called("update")).toBe(false);
    expect(insertedValues()).toHaveLength(0);
  });

  it("rejects an unusable email address inline, without touching the row", async () => {
    await signInAs("collaborator");

    const result = await updateTourRequest({}, edit({ email: "not-an-address" }));

    expect(result.fieldErrors?.email).toBeTruthy();
    expect(called("update")).toBe(false);
  });
});

describe("logging that someone reached out", () => {
  it("moves a new lead to contacted and stamps the time", async () => {
    await signInAs("collaborator");
    queueResult([{ status: "new" }]); // the status lookup
    queueResult(undefined); // the update
    queueResult(undefined); // the audit insert

    const result = await logContactAttempt({}, form({ id: REQUEST_ID }));

    expect(result.ok).toBe(true);

    const update = calls.find((call) => call.method === "set")!;
    const values = update.args[0] as Record<string, unknown>;
    expect(values.status).toBe("contacted");
    expect(values.lastContactedAt).toBeInstanceOf(Date);

    expect(insertedValues()[0]).toMatchObject({
      action: "tour_request.contact_logged",
      actorUserId: COLLABORATOR_ID,
    });
  });

  it("does not drag a quoted lead backwards", async () => {
    // Ringing to confirm a detail is not a regression in the pipeline.
    await signInAs("collaborator");
    queueResult([{ status: "quoted" }]);
    queueResult(undefined);
    queueResult(undefined);

    await logContactAttempt({}, form({ id: REQUEST_ID }));

    const values = calls.find((call) => call.method === "set")!.args[0] as Record<
      string,
      unknown
    >;
    expect(values.status).toBe("quoted");
  });
});

describe("the experience catalogue", () => {
  const EXPERIENCE_ID = "44444444-4444-4444-8444-444444444444";

  function experienceForm(overrides: Record<string, string | string[]> = {}): FormData {
    return form({
      slug: "nova-prova",
      kind: "complement",
      icon: "wine",
      image: "/images/rural-saloia/picnic-hamper-and-table.jpg",
      active: "on",
      sortOrder: "5",
      titlePt: "Nova Prova",
      titleEn: "New Tasting",
      taglinePt: "Uma prova nova",
      taglineEn: "A new tasting",
      summaryPt: "Resumo em português.",
      summaryEn: "Summary in English.",
      durationPt: "Aprox. 1h",
      durationEn: "Approx. 1h",
      imageAltPt: "Copos de vinho",
      imageAltEn: "Wine glasses",
      descriptionPt: "Primeiro parágrafo.\n\nSegundo parágrafo.",
      descriptionEn: "First paragraph.\n\nSecond paragraph.",
      highlightsPt: "Prova guiada\nCastas locais",
      highlightsEn: "Guided tasting\nLocal grapes",
      ...overrides,
    });
  }

  it("stores the localized pairs the site renders, and republishes the site", async () => {
    await signInAs("collaborator");
    queueResult([]); // no slug clash
    queueResult(undefined); // the insert
    queueResult(undefined); // the audit insert

    const result = await saveExperience({}, experienceForm());

    expect(result.ok).toBe(true);

    const inserted = insertedValues()[0]!;
    expect(inserted).toMatchObject({
      slug: "nova-prova",
      icon: "wine",
      title: { pt: "Nova Prova", en: "New Tasting" },
      description: {
        pt: ["Primeiro parágrafo.", "Segundo parágrafo."],
        en: ["First paragraph.", "Second paragraph."],
      },
      highlights: {
        pt: ["Prova guiada", "Castas locais"],
        en: ["Guided tasting", "Local grapes"],
      },
    });

    // An edit nobody can see on the website is not an edit.
    expect(revalidatePath).toHaveBeenCalled();
  });

  it("drops a question that is only written in one language", async () => {
    await signInAs("collaborator");
    queueResult([]);
    queueResult(undefined);
    queueResult(undefined);

    await saveExperience(
      {},
      experienceForm({
        faqQuestionPt: ["Quanto tempo dura?", "Só em português?"],
        faqQuestionEn: ["How long is it?", ""],
        faqAnswerPt: ["Cerca de uma hora.", "Sim."],
        faqAnswerEn: ["About an hour.", ""],
      }),
    );

    const inserted = insertedValues()[0]!;
    expect(inserted.faqs).toEqual([
      {
        question: { pt: "Quanto tempo dura?", en: "How long is it?" },
        answer: { pt: "Cerca de uma hora.", en: "About an hour." },
      },
    ]);
  });

  it("reports a taken address against the field rather than throwing", async () => {
    await signInAs("collaborator");
    queueResult([{ id: EXPERIENCE_ID }]); // the clash lookup finds one

    const result = await saveExperience({}, experienceForm());

    expect(result.fieldErrors?.slug).toBeTruthy();
    expect(called("insert")).toBe(false);
  });

  it("refuses a badly shaped address", async () => {
    await signInAs("collaborator");

    const result = await saveExperience({}, experienceForm({ slug: "Nova Prova!" }));

    expect(result.fieldErrors?.slug).toBeTruthy();
    expect(called("select")).toBe(false);
  });

  it("is not deletable by a collaborator", async () => {
    await signInAs("collaborator");

    expect(
      await redirectedTo(() =>
        deleteExperience({}, form({ id: EXPERIENCE_ID, confirm: "APAGAR" })),
      ),
    ).toBe(ADMIN_FORBIDDEN_PATH);

    expect(called("delete")).toBe(false);
    expect(called("select")).toBe(false);
  });
});

/**
 * Cancelling a paid booking from the Sales board.
 *
 * Four things have to happen together or the action is worse than useless: the
 * money goes back, the car stops being counted against the departure, the guest
 * is told, and the audit log names whoever decided it. The email is the one
 * best-effort part (it is unconfigured here, as in CI); the other three are
 * asserted below, through the real action and the real audit writer.
 */
describe("cancelling and refunding a booking", () => {
  const fullRefund = () =>
    form({ bookingId: BOOKING_ID, refundAmount: "340", confirm: "REEMBOLSAR" });

  it("refunds through Stripe, frees the car and records who did it", async () => {
    await signInAs("collaborator");
    queueResult([bookingRow()]); // the lookup
    queueResult([bookingRow({ status: "cancelled" })]); // the claim
    refundsCreate.mockResolvedValue({ id: "re_test_1" });
    queueResult([bookingRow({ status: "refunded", refundedAmountCents: 34000 })]);
    queueResult(undefined); // the audit insert

    const result = await cancelBooking({}, fullRefund());

    expect(result.ok).toBe(true);
    expect(refundsCreate).toHaveBeenCalledWith(
      expect.objectContaining({ payment_intent: "pi_test_1", amount: 34000 }),
      // Keyed, so a double-submitted form cannot refund the same money twice.
      expect.objectContaining({ idempotencyKey: expect.stringContaining(BOOKING_ID) }),
    );

    // The claim leaves the booking out of the capacity-holding statuses, which
    // *is* the seat release — `lib/bookings.ts` counts nothing else.
    expect(updatedValues()[0]).toMatchObject({
      status: "cancelled",
      cancelledVia: "admin",
    });
    expect(updatedValues()[1]).toMatchObject({
      status: "refunded",
      refundedAmountCents: 34000,
      stripeRefundId: "re_test_1",
    });

    const entry = insertedValues()[0]!;
    expect(entry).toMatchObject({
      actorUserId: COLLABORATOR_ID,
      action: "booking.refunded",
      entityType: "booking",
      entityId: BOOKING_ID,
    });
    const after = entry.after as Record<string, unknown>;
    expect(after.amountCents).toBe(34000);
    expect(after.refundedAmountCents).toBe(34000);
    expect(after.stripeRefundId).toBe("re_test_1");

    // The public calendar renders occupancy and is cached.
    expect(revalidatePath).toHaveBeenCalled();
  });

  it("does not return an application fee that was never taken", async () => {
    await signInAs("owner");
    queueResult([bookingRow()]);
    queueResult([bookingRow({ status: "cancelled" })]);
    refundsCreate.mockResolvedValue({ id: "re_test_1" });
    queueResult([bookingRow({ status: "refunded", refundedAmountCents: 34000 })]);
    queueResult(undefined);

    await cancelBooking({}, fullRefund());

    // Nothing takes an application fee yet (the fee itself is the next stub),
    // and asking Stripe to refund one that does not exist is an error, not a
    // no-op.
    expect(refundsCreate.mock.calls[0][0]).not.toHaveProperty("refund_application_fee");
  });

  it("returns the fee in proportion when the charge carried one", async () => {
    await signInAs("owner");
    paymentIntentsRetrieve.mockResolvedValue({
      latest_charge: { application_fee_amount: 1360 },
    });
    queueResult([bookingRow()]);
    queueResult([bookingRow({ status: "cancelled" })]);
    refundsCreate.mockResolvedValue({ id: "re_test_1" });
    queueResult([bookingRow({ status: "refunded", refundedAmountCents: 17000 })]);
    queueResult(undefined);

    await cancelBooking(
      {},
      form({ bookingId: BOOKING_ID, refundAmount: "170", confirm: "REEMBOLSAR" }),
    );

    // Stripe does the proportional arithmetic the commission agreement asks
    // for; the flag is what asks it to.
    expect(refundsCreate.mock.calls[0][0]).toMatchObject({
      amount: 17000,
      refund_application_fee: true,
    });
  });

  it("cancels without touching Stripe when nothing is being returned", async () => {
    await signInAs("collaborator");
    queueResult([bookingRow()]);
    queueResult([bookingRow({ status: "cancelled" })]);
    queueResult([bookingRow({ status: "cancelled" })]);
    queueResult(undefined);

    const result = await cancelBooking(
      {},
      form({ bookingId: BOOKING_ID, refundAmount: "0", confirm: "REEMBOLSAR" }),
    );

    expect(result.ok).toBe(true);
    expect(refundsCreate).not.toHaveBeenCalled();
    // `refunded` would be a refund that never happened, in the books.
    expect(updatedValues()[1]).toMatchObject({ status: "cancelled" });
    expect(insertedValues()[0]).toMatchObject({ action: "booking.cancelled" });
  });

  it("refuses more than is left to refund, before anything is written", async () => {
    await signInAs("owner");
    queueResult([bookingRow({ refundedAmountCents: 20000 })]);

    const result = await cancelBooking({}, fullRefund());

    expect(result.error).toContain("140");
    expect(refundsCreate).not.toHaveBeenCalled();
    expect(called("update")).toBe(false);
  });

  it("refuses a booking that is not a paid one", async () => {
    await signInAs("owner");
    queueResult([bookingRow({ status: "refunded", refundedAmountCents: 34000 })]);

    const result = await cancelBooking({}, fullRefund());

    expect(result.error).toBeTruthy();
    expect(refundsCreate).not.toHaveBeenCalled();
    expect(called("update")).toBe(false);
  });

  it("leaves the booking cancelled and says so when Stripe refuses", async () => {
    await signInAs("owner");
    queueResult([bookingRow()]);
    queueResult([bookingRow({ status: "cancelled" })]);
    refundsCreate.mockRejectedValue(new Error("card_declined"));
    queueResult(undefined); // the audit insert for the failed refund

    const result = await cancelBooking({}, fullRefund());

    // The row is claimed before the money moves precisely so this state is
    // visible rather than a refund with no booking behind it.
    expect(result.ok).toBeUndefined();
    expect(result.error).toContain("Stripe");
    const failed = insertedValues()[0]!.after as Record<string, unknown>;
    expect(failed.refundFailed).toBe(true);
    expect(failed.refundRequestedCents).toBe(34000);
  });

  it("will not act without the typed confirmation", async () => {
    await signInAs("owner");

    const result = await cancelBooking(
      {},
      form({ bookingId: BOOKING_ID, refundAmount: "340", confirm: "sim" }),
    );

    expect(result.error).toBeTruthy();
    expect(called("select")).toBe(false);
    expect(refundsCreate).not.toHaveBeenCalled();
  });

  it("sends a signed-out caller to the login screen, refunding nothing", async () => {
    // `proxy.ts` does not gate action POSTs — `requireAdmin()` in the action is
    // the only thing between a signed-out POST and a refund.
    expect(await redirectedTo(() => cancelBooking({}, fullRefund()))).toBe(
      "/admin/login",
    );

    expect(called("select")).toBe(false);
    expect(refundsCreate).not.toHaveBeenCalled();
  });
});
