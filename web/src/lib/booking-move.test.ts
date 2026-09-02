import { describe, expect, it } from "vitest";

import { describeSlot, TOUR_SLOTS, type DaySlots } from "@/lib/availability";
import { isMovable, viableMoveTargets } from "@/lib/booking-move";
import { noVehicles, type VehicleClass } from "@/lib/fleet";
import type { SlotOccupancy } from "@/lib/bookings";
import type { AvailabilityRow, AvailabilitySlot } from "@/db";

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
