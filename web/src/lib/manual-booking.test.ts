import { describe, expect, it } from "vitest";

import { describeSlot, TOUR_SLOTS, type DaySlots } from "@/lib/availability";
import { MAX_PARTY_ONLINE, noVehicles, type VehicleClass } from "@/lib/fleet";
import { manualBookingPrefill, openDepartures } from "@/lib/manual-booking";
import type { SlotOccupancy } from "@/lib/bookings";
import type { AvailabilityRow, AvailabilitySlot } from "@/db";

/**
 * What the Sales board's "Registar reserva" sheet is handed before Rita types a
 * word: the guest, off the enquiry she is answering, and the departures she may
 * sell them.
 *
 * Every failure here is a phone call gone wrong in a way the operator cannot
 * see — a party of six prefilled as two, a retired tour preselected so the
 * first one in the list is sold instead, or a closed day offered and then
 * refused. The reads around these two are typed queries covered by the build,
 * per the convention in `availability.test.ts`.
 */

const CLASSIC_TOUR = "rural-saloia";
const TOURING_TOUR = "obidos-medieval-villages";
const SELLABLE = [{ slug: CLASSIC_TOUR }, { slug: TOURING_TOUR }];

const LEAD_ID = "9c3b1f6e-1d2a-4a8f-9f7c-2b8d4e5a6c71";

/** An enquiry as either the board or the lead page holds it. */
function lead(
  overrides: Partial<Parameters<typeof manualBookingPrefill>[0]> = {},
): Parameters<typeof manualBookingPrefill>[0] {
  return {
    id: LEAD_ID,
    name: "Marta Nunes",
    email: "marta@example.pt",
    phone: "+351 912 345 678",
    experienceSlug: CLASSIC_TOUR,
    partySize: 4,
    ...overrides,
  };
}

describe("manualBookingPrefill", () => {
  it("carries the enquiry's own contact details into the sheet", () => {
    expect(manualBookingPrefill(lead(), SELLABLE)).toMatchObject({
      leadId: LEAD_ID,
      name: "Marta Nunes",
      email: "marta@example.pt",
      phone: "+351 912 345 678",
    });
  });

  it("names the lead it would be recorded against", () => {
    // The whole point of the board's mount: this id is what moves the enquiry
    // to `Reservado` instead of creating a second card for the same couple.
    expect(manualBookingPrefill(lead(), SELLABLE).leadId).toBe(LEAD_ID);
  });

  it("puts the party in as adults, because a headcount says nothing else", () => {
    expect(manualBookingPrefill(lead({ partySize: 4 }), SELLABLE)).toMatchObject({
      adults: 4,
      children: 0,
      infants: 0,
    });
  });

  it("starts at two when the enquiry never said how many", () => {
    expect(manualBookingPrefill(lead({ partySize: null }), SELLABLE).adults).toBe(2);
  });

  it("clamps a party above what the fleet takes online to the stepper's ceiling", () => {
    // A coach party is a real enquiry. Showing the ceiling is a conversation
    // the operator can have; silently showing 2 is one they cannot.
    expect(manualBookingPrefill(lead({ partySize: 24 }), SELLABLE).adults).toBe(
      MAX_PARTY_ONLINE,
    );
  });

  it("never prefills a party of zero", () => {
    expect(manualBookingPrefill(lead({ partySize: 0 }), SELLABLE).adults).toBe(1);
  });

  it("preselects the tour the enquiry asked for", () => {
    expect(manualBookingPrefill(lead({ experienceSlug: TOURING_TOUR }), SELLABLE))
      .toMatchObject({ experience: TOURING_TOUR });
  });

  it("drops a tour the sheet cannot sell, rather than preselecting a missing option", () => {
    // A retired or archived route is not in the `<Select>`; preselecting it
    // would leave the first tour in the list selected and sold instead.
    expect(
      manualBookingPrefill(lead({ experienceSlug: "olaria-mz" }), SELLABLE).experience,
    ).toBeNull();
  });

  it("leaves the tour unchosen when the enquiry named none", () => {
    expect(manualBookingPrefill(lead({ experienceSlug: null }), SELLABLE).experience)
      .toBeNull();
  });

  it("blanks the fields an anonymised lead no longer has", () => {
    const prefill = manualBookingPrefill(lead({ email: null, phone: null }), SELLABLE);
    expect(prefill.email).toBe("");
    expect(prefill.phone).toBe("");
  });
});

// ---------------------------------------------------------------------------
// The picker's rule
// ---------------------------------------------------------------------------

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

describe("openDepartures", () => {
  it("offers both departures of an open day", () => {
    expect(openDepartures([day("2026-08-10")])).toEqual([
      { date: "2026-08-10", slot: "morning" },
      { date: "2026-08-10", slot: "afternoon" },
    ]);
  });

  it("skips days nobody has opened", () => {
    expect(openDepartures([day("2026-08-10", { open: false })])).toEqual([]);
  });

  it("skips a departure whose drivers are all out, whichever tour took them", () => {
    const departures = openDepartures([
      day("2026-08-10", { drivers: 1, used: { morning: committed("touring") } }),
    ]);
    expect(departures).toEqual([{ date: "2026-08-10", slot: "afternoon" }]);
  });

  it("never offers a day that has already happened", () => {
    expect(openDepartures([day("2026-07-30", { today: "2026-08-01" })])).toEqual([]);
  });
});
