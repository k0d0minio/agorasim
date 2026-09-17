import { beforeEach, describe, expect, it, vi } from "vitest";

import { createSessionToken } from "@/lib/admin-session";
import type { AdminUserSummary } from "@/lib/admin-users";

/**
 * The Sales board's phone booking, through the real action.
 *
 * `createManualBooking` has two mounts and one job, and the property worth
 * holding is what each mount does to the *lead*: opened from a day in the
 * Calendar there is no enquiry behind the call, so one is created; opened from
 * a card on the Sales board there already is one, and a second row would put
 * the same couple on the board twice — one card carrying the money and one
 * still sitting in `Novo`, which is the failure this whole ticket exists to
 * remove. So the stage move is asserted here rather than in the component: it
 * is a database write and an audit entry, not a rendering.
 *
 * Only the edges are faked: the request's cookies, the account store, Next's
 * cache, and the Neon client. The schema, the pricing, the audit writer and the
 * form schema are all real, so what is asserted is what a row would contain.
 * The capacity check is stubbed to a yes — `lib/availability.ts` has its own
 * suite, and what is under test here is what happens *after* a departure fits.
 */

// ---------------------------------------------------------------------------
// A fake Neon client: chainable, and resolving to whatever the test queued.
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
  // The real schema, so column references and SQL building are genuine.
  const schema = await vi.importActual<typeof import("@/db/schema")>("@/db/schema");
  return { ...schema, db: fakeDb };
});

// ---------------------------------------------------------------------------
// Request-bound edges
// ---------------------------------------------------------------------------

const cookieJar = new Map<string, string>();

vi.mock("next/headers", () => ({
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

vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new Error(`NEXT_REDIRECT:${to}`);
  },
}));

vi.mock("@/lib/request-ip", () => ({ clientIp: async () => "203.0.113.9" }));

const revalidatePath = vi.fn();
vi.mock("next/cache", () => ({
  revalidatePath: (...args: unknown[]) => revalidatePath(...args),
}));

// The capacity check says yes; `availability.test.ts` owns the arithmetic that
// decides it, and everything else in the module is the real thing.
vi.mock("@/lib/availability", async () => {
  const actual =
    await vi.importActual<typeof import("@/lib/availability")>("@/lib/availability");
  return {
    ...actual,
    checkSlotAvailable: vi.fn(async () => ({ ok: true, vehicleClass: "classic-small" })),
  };
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

const findAdminUserById = vi.fn<(id: string) => Promise<AdminUserSummary | null>>();

vi.mock("@/lib/admin-users", () => ({
  findAdminUserById: (id: string) => findAdminUserById(id),
  normalizeEmail: (email: string) => email.trim().toLowerCase(),
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

const { ADMIN_SESSION_COOKIE } = await import("@/lib/admin-session");
const { createManualBooking } = await import("./actions");

const OWNER_ID = "11111111-1111-4111-8111-111111111111";
const LEAD_ID = "33333333-3333-4333-8333-333333333333";
const BOOKING_ID = "44444444-4444-4444-8444-444444444444";

function account(): AdminUserSummary {
  return {
    id: OWNER_ID,
    email: "rita@agorasim.pt",
    name: "Rita",
    role: "owner",
    lastLoginAt: null,
    disabledAt: null,
    sessionsValidFrom: new Date("2020-01-01T00:00:00Z"),
    createdAt: new Date("2020-01-01T00:00:00Z"),
  };
}

async function signIn(): Promise<void> {
  const user = account();
  cookieJar.set(ADMIN_SESSION_COOKIE, await createSessionToken(user.id));
  findAdminUserById.mockResolvedValue(user);
}

function form(values: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.append(key, value);
  return data;
}

/** A well-formed sale of two adults on the 15th, as either mount posts it. */
function sale(overrides: Record<string, string> = {}): FormData {
  return form({
    date: "2026-08-15",
    slot: "morning",
    experience: "rural-saloia",
    mode: "public",
    adults: "2",
    children: "0",
    infants: "0",
    name: "Marta Nunes",
    email: "marta@example.pt",
    phone: "+351 912 345 678",
    amount: "",
    ...overrides,
  });
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

/** The audit rows written this test — the inserts carrying an `action`. */
function auditRows(): Record<string, unknown>[] {
  return insertedValues().filter((values) => typeof values.action === "string");
}

/**
 * Queue the reads a sale from the Sales board makes, in order: the source
 * enquiry, the catalogue (empty, so the shipped one is used), the moved lead,
 * and the booking.
 */
function queueBoardSale(leadStatus = "new"): void {
  queueResult([{ id: LEAD_ID, status: leadStatus, locale: "pt" }]);
  queueResult([]);
  queueResult([{ id: LEAD_ID }]);
  queueResult([{ id: BOOKING_ID }]);
}

beforeEach(() => {
  calls = [];
  results = [];
  cookieJar.clear();
  revalidatePath.mockClear();
  findAdminUserById.mockReset();
});

describe("createManualBooking from the Sales board", () => {
  it("moves the source enquiry to the booked stage instead of creating a second one", async () => {
    await signIn();
    queueBoardSale();

    const state = await createManualBooking({}, sale({ leadId: LEAD_ID }));

    expect(state.ok).toBe(true);
    // The lead was updated, not inserted again: exactly one `tour_requests`
    // row is involved, and it is the one the operator was looking at.
    expect(updatedValues()[0]).toMatchObject({ status: "booked" });
    expect(insertedValues().some((values) => values.source === "phone")).toBe(false);
  });

  it("attaches the booking to that lead, so one card carries the money", async () => {
    await signIn();
    queueBoardSale();

    await createManualBooking({}, sale({ leadId: LEAD_ID }));

    const booking = insertedValues().find((values) => values.paymentMethod === "cash");
    expect(booking).toMatchObject({
      tourRequestId: LEAD_ID,
      date: "2026-08-15",
      slot: "morning",
      status: "confirmed",
    });
  });

  it("writes the corrected contact details back onto the lead", async () => {
    await signIn();
    queueBoardSale();

    // The address was read back down the phone and was wrong on the enquiry.
    await createManualBooking(
      {},
      sale({ leadId: LEAD_ID, email: "marta.nunes@example.pt" }),
    );

    expect(updatedValues()[0]).toMatchObject({
      name: "Marta Nunes",
      email: "marta.nunes@example.pt",
      preferredDate: "2026-08-15",
    });
  });

  it("leaves the lead's source alone — where it came from is not who closed it", async () => {
    await signIn();
    queueBoardSale();

    await createManualBooking({}, sale({ leadId: LEAD_ID }));

    expect(updatedValues()[0]).not.toHaveProperty("source");
  });

  it("records the stage move against the lead, so its Histórico shows it", async () => {
    await signIn();
    queueBoardSale("contacted");

    await createManualBooking({}, sale({ leadId: LEAD_ID }));

    const move = auditRows().find(
      (row) => row.action === "tour_request.status_changed",
    );
    expect(move).toMatchObject({
      actorUserId: OWNER_ID,
      entityType: "tour_request",
      entityId: LEAD_ID,
      before: { status: "contacted" },
      after: { status: "booked" },
    });
  });

  it("names the source enquiry on the booking's own audit entry", async () => {
    await signIn();
    queueBoardSale();

    await createManualBooking({}, sale({ leadId: LEAD_ID }));

    const created = auditRows().find((row) => row.action === "booking.created");
    expect(created?.after).toMatchObject({
      sourceEnquiryId: LEAD_ID,
      sourceEnquiryRef: "EN-333333",
      sourceEnquiryExisting: true,
      paymentMethod: "cash",
    });
  });

  it("refuses a lead that is no longer there rather than booking a stranger", async () => {
    await signIn();
    // The enquiry was deleted while the board sat open.
    queueResult([]);

    const state = await createManualBooking({}, sale({ leadId: LEAD_ID }));

    expect(state.ok).toBeUndefined();
    expect(state.error).toBe("Esse pedido já não existe.");
    // Nothing was written: no lead, no booking, no audit row.
    expect(insertedValues()).toEqual([]);
    expect(updatedValues()).toEqual([]);
  });

  it("refuses a malformed lead id instead of silently creating a new lead", async () => {
    await signIn();

    const state = await createManualBooking({}, sale({ leadId: "not-a-uuid" }));

    expect(state.error).toBe("Esse pedido já não existe.");
    expect(insertedValues()).toEqual([]);
  });
});

describe("createManualBooking from the Calendar", () => {
  it("still creates the lead itself when no enquiry is behind the call", async () => {
    await signIn();
    queueResult([]); // the catalogue — falls back to the shipped one
    queueResult([{ id: LEAD_ID }]);
    queueResult([{ id: BOOKING_ID }]);

    const state = await createManualBooking({}, sale());

    expect(state.ok).toBe(true);
    // The behaviour the day sheet has always had: a fresh `booked` lead,
    // sourced `phone`, and nothing updated.
    expect(insertedValues()[0]).toMatchObject({
      name: "Marta Nunes",
      status: "booked",
      source: "phone",
      preferredDate: "2026-08-15",
    });
    expect(updatedValues()).toEqual([]);
  });

  it("records no stage move, because no lead was moved", async () => {
    await signIn();
    queueResult([]);
    queueResult([{ id: LEAD_ID }]);
    queueResult([{ id: BOOKING_ID }]);

    await createManualBooking({}, sale());

    expect(
      auditRows().some((row) => row.action === "tour_request.status_changed"),
    ).toBe(false);
    expect(
      auditRows().find((row) => row.action === "booking.created")?.after,
    ).toMatchObject({ sourceEnquiryExisting: false });
  });
});
