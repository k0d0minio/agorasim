import { beforeEach, describe, expect, it, vi } from "vitest";

import { describeSlot, TOUR_SLOTS, type DaySlots } from "@/lib/availability";
import { noVehicles, type VehicleClass } from "@/lib/fleet";
import type { SlotOccupancy } from "@/lib/bookings";
import type { AvailabilityRow, AvailabilitySlot } from "@/db";

// ---------------------------------------------------------------------------
// A fake Neon client for `moveBookingToDeparture` — chainable, and resolving
// to whatever the test queued, in the shape `app/admin/actions.test.ts` uses.
// `viableMoveTargets`/`isMovable` below need none of this: they touch no
// database, so this machinery only matters to the `moveBookingToDeparture`
// suite further down.
// ---------------------------------------------------------------------------

let calls: { method: string; args: unknown[] }[] = [];
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

// The re-check the move calls: mocked so the suite decides whether the target
// is free, rather than re-testing `checkSlotAvailable` itself here.
const checkSlotAvailable = vi.fn();
vi.mock("@/lib/availability", async () => {
  const actual = await vi.importActual<typeof import("@/lib/availability")>("@/lib/availability");
  return { ...actual, checkSlotAvailable: (...args: unknown[]) => checkSlotAvailable(...args) };
});

const slotOccupancyOn = vi.fn();
vi.mock("@/lib/bookings", async () => {
  const actual = await vi.importActual<typeof import("@/lib/bookings")>("@/lib/bookings");
  return { ...actual, slotOccupancyOn: (...args: unknown[]) => slotOccupancyOn(...args) };
});

const recordAuditOrWarn = vi.fn();
vi.mock("@/lib/audit", () => ({
  recordAuditOrWarn: (...args: unknown[]) => recordAuditOrWarn(...args),
}));

vi.mock("@/lib/email", () => ({ isEmailConfigured: () => true }));

vi.mock("@/lib/experience-catalogue", () => ({ listCatalogue: async () => [] }));

vi.mock("@/lib/cancellation-token", () => ({
  isCancellationTokenConfigured: () => false,
  issueCancellationToken: vi.fn(),
  cancellationPath: vi.fn(),
}));

const sendLoggedEmail = vi.fn();
vi.mock("@/lib/message-log", () => ({
  sendLoggedEmail: (...args: unknown[]) => sendLoggedEmail(...args),
}));

const { isMovable, moveBookingToDeparture, viableMoveTargets } = await import(
  "@/lib/booking-move"
);

/**
 * The move picker's rule.
 *
 * Every failure here is a departure offered to an operator that the action
 * would then refuse — a closed day, a full one, one whose only free car is the
 * wrong class for the party, or the booking's own departure offered back to it
 * as somewhere to move to. The reads around it are typed queries covered by the
 * build, per the convention in `availability.test.ts`.
 */

const CLASSIC_TOUR = "rural-saloia";
const TOURING_TOUR = "obidos-medieval-villages";

function row(date: string, slot: AvailabilitySlot, drivers = 2): AvailabilityRow {
  return {
    id: `${date}-${slot}`,
    date,
    slot,
    drivers,
    status: "open",
    note: null,
    createdAt: new Date("2026-08-01T10:00:00Z"),
    updatedAt: new Date("2026-08-01T10:00:00Z"),
  };
}

/** A day the calendar has been asked about, with whatever is already out on it. */
function day(
  date: string,
  options: {
    open?: boolean;
    drivers?: number;
    used?: Partial<Record<AvailabilitySlot, SlotOccupancy>>;
    today?: string;
  } = {},
): DaySlots {
  const { open = true, drivers = 2, used = {}, today = "2026-08-01" } = options;
  return {
    date,
    slots: TOUR_SLOTS.map((slot) =>
      describeSlot({
        date,
        slot,
        row: open ? row(date, slot, drivers) : null,
        occupancy: used[slot],
        today,
      }),
    ),
  };
}

/** Occupancy as a list of "this class of car went out", one driver each. */
function committed(...classes: VehicleClass[]): SlotOccupancy {
  const vehicles = noVehicles();
  for (const entry of classes) vehicles[entry] += 1;
  return { drivers: classes.length, vehicles };
}

const from = { date: "2026-08-15", slot: "morning" as const };

describe("viableMoveTargets", () => {
  it("offers every open departure a party of two fits", () => {
    const targets = viableMoveTargets({
      days: [day("2026-08-20"), day("2026-08-21")],
      experienceSlug: CLASSIC_TOUR,
      partySize: 2,
      from,
    });

    expect(targets).toEqual([
      { date: "2026-08-20", slot: "morning" },
      { date: "2026-08-20", slot: "afternoon" },
      { date: "2026-08-21", slot: "morning" },
      { date: "2026-08-21", slot: "afternoon" },
    ]);
  });

  it("never offers the departure the booking is already on", () => {
    const targets = viableMoveTargets({
      days: [day("2026-08-15")],
      experienceSlug: CLASSIC_TOUR,
      partySize: 2,
      from,
    });

    // The other half of its own day is a real move and stays on the list.
    expect(targets).toEqual([{ date: "2026-08-15", slot: "afternoon" }]);
  });

  it("skips days nobody has opened", () => {
    const targets = viableMoveTargets({
      days: [day("2026-08-20", { open: false }), day("2026-08-21")],
      experienceSlug: CLASSIC_TOUR,
      partySize: 2,
      from,
    });

    expect(targets.every((target) => target.date === "2026-08-21")).toBe(true);
  });

  it("skips a departure whose drivers are all out, whichever tour took them", () => {
    const targets = viableMoveTargets({
      days: [
        day("2026-08-20", { used: { morning: committed("touring", "touring") } }),
        day("2026-08-21"),
      ],
      experienceSlug: CLASSIC_TOUR,
      partySize: 2,
      from,
    });

    // Both drivers are driving Óbidos that morning; the classics are free and
    // it makes no difference — that is the whole of AGORA-012.
    expect(targets).not.toContainEqual({ date: "2026-08-20", slot: "morning" });
    expect(targets).toContainEqual({ date: "2026-08-20", slot: "afternoon" });
  });

  it("skips a departure where the class of car this party needs is gone", () => {
    const targets = viableMoveTargets({
      days: [day("2026-08-20", { used: { morning: committed("classic-van") } })],
      experienceSlug: CLASSIC_TOUR,
      partySize: 5,
      from,
    });

    // Five people need the T3, and the T3 is out — even though a driver and
    // three small classics are free.
    expect(targets).not.toContainEqual({ date: "2026-08-20", slot: "morning" });
    expect(targets).toContainEqual({ date: "2026-08-20", slot: "afternoon" });
  });

  it("offers a departure to Óbidos that the classics have already filled", () => {
    const targets = viableMoveTargets({
      days: [day("2026-08-20", { drivers: 2, used: { morning: committed("classic-small") } })],
      experienceSlug: TOURING_TOUR,
      partySize: 2,
      from,
    });

    // One driver left and the touring vehicle untouched: Óbidos never draws on
    // the classic fleet.
    expect(targets).toContainEqual({ date: "2026-08-20", slot: "morning" });
  });

  it("offers nothing to a party the site cannot sell to online", () => {
    const targets = viableMoveTargets({
      days: [day("2026-08-20"), day("2026-08-21")],
      experienceSlug: CLASSIC_TOUR,
      partySize: 9,
      from,
    });

    expect(targets).toEqual([]);
  });

  it("never offers a day that has already happened", () => {
    const targets = viableMoveTargets({
      days: [day("2026-07-30", { today: "2026-08-01" }), day("2026-08-20")],
      experienceSlug: CLASSIC_TOUR,
      partySize: 2,
      from,
    });

    expect(targets.every((target) => target.date === "2026-08-20")).toBe(true);
  });
});

describe("isMovable", () => {
  it("is true for a paid booking and false for every other state", () => {
    expect(isMovable({ status: "confirmed" })).toBe(true);
    for (const status of ["pending", "cancelled", "refunded", "expired"] as const) {
      expect(isMovable({ status })).toBe(false);
    }
  });
});

/**
 * The move itself, and the notice it earns — AGORA's move-back review.
 *
 * `sendMoveEmail` is best-effort and never surfaces in `MoveOutcome`, so the
 * only window onto "did the guest get told, and under what claim?" is the
 * `sendLoggedEmail` call it makes. What is asserted here is that window: the
 * claim's key for a three-move sequence, and that a retry never opens one at
 * all. Whether that key actually stops a duplicate is `message-log.test.ts`'s
 * question, not this file's.
 */
describe("moveBookingToDeparture", () => {
  const BOOKING_ID = "cccccccc-0000-4000-8000-000000000099";
  const LEAD = "dddddddd-0000-4000-8000-000000000099";

  function bookingRow(overrides: Record<string, unknown> = {}) {
    return {
      id: BOOKING_ID,
      tourRequestId: LEAD,
      date: "2026-08-01",
      slot: "morning",
      experienceSlug: CLASSIC_TOUR,
      addOns: [] as string[],
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
      moveSeq: 0,
      cancellationTokenHash: null,
      ...overrides,
    };
  }

  const leadRow = { id: LEAD, name: "Ana Silva", email: "ana@example.com", phone: null };

  /** Queue one successful move's three reads/writes: the row, the update, the lead. */
  function queueMove(before: Record<string, unknown>, after: Record<string, unknown>) {
    queueResult([bookingRow(before)]);
    queueResult([bookingRow(after)]);
    queueResult([leadRow]);
  }

  beforeEach(() => {
    calls = [];
    results = [];
    checkSlotAvailable.mockReset();
    checkSlotAvailable.mockResolvedValue({ ok: true, vehicleClass: "classic-small" });
    slotOccupancyOn.mockReset();
    slotOccupancyOn.mockResolvedValue({ drivers: 0, vehicles: noVehicles() });
    recordAuditOrWarn.mockReset();
    recordAuditOrWarn.mockResolvedValue(undefined);
    sendLoggedEmail.mockReset();
    sendLoggedEmail.mockResolvedValue({ status: "sent", providerMessageId: "re_1" });
  });

  it("earns its own move notice on every real move, including a return to a date already visited", async () => {
    // X (1 Aug) → A (15 Aug): move-seq 0 → 1.
    queueMove({ date: "2026-08-01", moveSeq: 0 }, { date: "2026-08-15", moveSeq: 1 });
    await moveBookingToDeparture({
      bookingId: BOOKING_ID,
      date: "2026-08-15",
      slot: "morning",
      actorUserId: "op-1",
    });

    // A (15 Aug) → B (22 Aug): the forecast turns, move-seq 1 → 2.
    queueMove({ date: "2026-08-15", moveSeq: 1 }, { date: "2026-08-22", moveSeq: 2 });
    await moveBookingToDeparture({
      bookingId: BOOKING_ID,
      date: "2026-08-22",
      slot: "morning",
      actorUserId: "op-1",
    });

    // B (22 Aug) → A (15 Aug) again: the flip-flop the review found, move-seq
    // 2 → 3 — a real, distinct move even though the date repeats.
    queueMove({ date: "2026-08-22", moveSeq: 2 }, { date: "2026-08-15", moveSeq: 3 });
    await moveBookingToDeparture({
      bookingId: BOOKING_ID,
      date: "2026-08-15",
      slot: "morning",
      actorUserId: "op-1",
    });

    expect(sendLoggedEmail).toHaveBeenCalledTimes(3);
    const subjects = sendLoggedEmail.mock.calls.map(
      (call: unknown[]) => call[0] as Record<string, unknown>,
    );
    expect(subjects.map((s) => [s.subjectDate, s.moveSeq])).toEqual([
      ["2026-08-15", 1],
      ["2026-08-22", 2],
      ["2026-08-15", 3],
    ]);
    // Every move earns its own claim — nothing here collapses the return to
    // the 15th into the first visit's move-seq.
    expect(new Set(subjects.map((s) => s.moveSeq)).size).toBe(3);
  });

  it("never touches the row or asks for a notice on a retry to where the booking already is", async () => {
    queueResult([bookingRow({ date: "2026-08-15", moveSeq: 1 })]);

    const outcome = await moveBookingToDeparture({
      bookingId: BOOKING_ID,
      date: "2026-08-15",
      slot: "morning",
      actorUserId: "op-1",
    });

    expect(outcome.status).toBe("same-departure");
    expect(sendLoggedEmail).not.toHaveBeenCalled();
    // The guard that makes this a no-op is `sameDeparture`, before any write:
    // a retried request never reaches the update, so it never has a second
    // move-seq to claim under.
    expect(calls.some((c) => c.method === "update")).toBe(false);
  });
});
