import { describe, expect, it } from "vitest";

import {
  anyVehicleFree,
  assignVehicle,
  CLASS_SEATS,
  DRIVERS_PER_SLOT,
  FLEET,
  FLEET_SIZE,
  MAX_PARTY_ONLINE,
  noVehicles,
  remainingVehicles,
  routeKindOf,
  slotFitsParty,
  usableDepartures,
  chosenDeparture,
  VEHICLE_CLASSES,
} from "@/lib/fleet";

/**
 * The fleet rule.
 *
 * Small, pure, and load-bearing in a way the tests have to pin down: it is the
 * one place that decides which car a booking takes, and both the browser and
 * the checkout act on its answer. Every case here is a wrong answer that costs
 * somebody a real morning — a party of four sold a three-seat 2CV, an Óbidos
 * booking quietly taking a classic off the Saloia routes, or a group of ten
 * sold a checkout the team has no third driver for.
 */

const CLASSIC = "rural-saloia";
const TOURING = "obidos-medieval-villages";

describe("the fleet as data", () => {
  it("is the cars Diogo & Rita actually have", () => {
    // Three small classics at three seats, the T3 at eight — info PDF §1.5.
    expect(FLEET_SIZE["classic-small"]).toBe(3);
    expect(FLEET_SIZE["classic-van"]).toBe(1);
    expect(CLASS_SEATS["classic-small"]).toBe(3);
    expect(CLASS_SEATS["classic-van"]).toBe(8);
  });

  it("keeps the Óbidos vehicle out of the classic pool", () => {
    // §2.6: that route is not driven in the classic cars, and the model has to
    // say so or a Lisbon departure starts eating the Sintra fleet.
    expect(FLEET_SIZE.touring).toBe(1);
    expect(FLEET.filter((car) => car.class === "touring")).toHaveLength(1);
  });

  it("sizes every class it names", () => {
    expect(VEHICLE_CLASSES.every((entry) => FLEET_SIZE[entry] > 0)).toBe(true);
  });

  it("rosters two drivers, and offers no way to invent a third", () => {
    // The stated maximum of 14 guests needs three cars and therefore three
    // drivers. Who that is, is AGORA-019's question — not this module's.
    expect(DRIVERS_PER_SLOT).toBe(2);
    expect(MAX_PARTY_ONLINE).toBe(CLASS_SEATS["classic-van"]);
  });
});

describe("routeKindOf", () => {
  it("knows the one route that is not in a classic car", () => {
    expect(routeKindOf(TOURING)).toBe("touring");
  });

  it("treats anything else as a classic-car route", () => {
    // The safe default: the Saloia offer is the classics, and a new route
    // nobody has classified must not be assumed to have a spare vehicle.
    expect(routeKindOf(CLASSIC)).toBe("classic");
    expect(routeKindOf("something-rita-adds-next-year")).toBe("classic");
  });
});

describe("assignVehicle", () => {
  it("gives up to three guests a small classic", () => {
    for (const size of [1, 2, 3]) {
      expect(assignVehicle(CLASSIC, size)).toEqual({
        ok: true,
        vehicleClass: "classic-small",
      });
    }
  });

  it("gives four to eight the T3", () => {
    for (const size of [4, 8]) {
      expect(assignVehicle(CLASSIC, size)).toEqual({
        ok: true,
        vehicleClass: "classic-van",
      });
    }
  });

  it("gives Óbidos the touring vehicle at any size it sells", () => {
    for (const size of [1, 3, 4, 8]) {
      expect(assignVehicle(TOURING, size)).toEqual({ ok: true, vehicleClass: "touring" });
    }
  });

  it("refuses nine and above on every route", () => {
    // Not "we are full" — "this needs a car and a driver we have not been told
    // about yet". The site sends these groups to the enquiry form.
    expect(assignVehicle(CLASSIC, 9)).toEqual({
      ok: false,
      reason: "party-too-large",
      max: MAX_PARTY_ONLINE,
    });
    expect(assignVehicle(TOURING, 14).ok).toBe(false);
  });

  it("refuses a party that is not a party", () => {
    expect(assignVehicle(CLASSIC, 0)).toEqual({ ok: false, reason: "empty-party" });
    expect(assignVehicle(CLASSIC, -2)).toEqual({ ok: false, reason: "empty-party" });
    expect(assignVehicle(CLASSIC, 2.5)).toEqual({ ok: false, reason: "empty-party" });
  });
});

describe("remainingVehicles / anyVehicleFree", () => {
  it("subtracts what is out, per class", () => {
    const used = noVehicles();
    used["classic-small"] = 2;
    const left = remainingVehicles(FLEET_SIZE, used);
    expect(left["classic-small"]).toBe(FLEET_SIZE["classic-small"] - 2);
    expect(left["classic-van"]).toBe(FLEET_SIZE["classic-van"]);
  });

  it("never goes negative, however the numbers were entered", () => {
    const used = noVehicles();
    used.touring = 9;
    expect(remainingVehicles(FLEET_SIZE, used).touring).toBe(0);
  });

  it("knows an empty yard when it sees one", () => {
    expect(anyVehicleFree(noVehicles())).toBe(false);
    expect(anyVehicleFree(FLEET_SIZE)).toBe(true);
  });
});

describe("slotFitsParty", () => {
  const full = { driversLeft: 2, vehiclesLeft: FLEET_SIZE };

  it("says yes when a driver and the right car are free", () => {
    expect(slotFitsParty(full, CLASSIC, 2)).toBe(true);
    expect(slotFitsParty(full, TOURING, 6)).toBe(true);
  });

  it("says no when the drivers are out, whatever is parked", () => {
    expect(slotFitsParty({ ...full, driversLeft: 0 }, CLASSIC, 2)).toBe(false);
  });

  it("says no when only the wrong class of car is free", () => {
    // A driver and three small classics — and a party of five to seat.
    const noVan = { ...FLEET_SIZE, "classic-van": 0 };
    expect(slotFitsParty({ driversLeft: 1, vehiclesLeft: noVan }, CLASSIC, 5)).toBe(false);
    expect(slotFitsParty({ driversLeft: 1, vehiclesLeft: noVan }, CLASSIC, 3)).toBe(true);
  });

  it("does not let Óbidos consume a classic", () => {
    // Every classic is out; the touring vehicle is not. Óbidos still leaves.
    const onlyTouring = { ...noVehicles(), touring: 1 };
    expect(slotFitsParty({ driversLeft: 1, vehiclesLeft: onlyTouring }, TOURING, 4)).toBe(
      true,
    );
    expect(slotFitsParty({ driversLeft: 1, vehiclesLeft: onlyTouring }, CLASSIC, 2)).toBe(
      false,
    );
  });

  it("says no to a group above the fleet even with everything free", () => {
    expect(slotFitsParty(full, CLASSIC, 9)).toBe(false);
  });
});

/**
 * The two derived questions the booking page asks of a day.
 *
 * Both the calendar and the form around it run these, on every render, over
 * the party of the moment — which is what stopped the two disagreeing about a
 * day after the party grew. A wrong answer here is a guest paying for a
 * departure the page had stopped showing them.
 */
describe("usableDepartures", () => {
  const day = [
    { slot: "morning", driversLeft: 1, vehiclesLeft: { ...noVehicles(), "classic-small": 1 } },
    { slot: "afternoon", driversLeft: 2, vehiclesLeft: FLEET_SIZE },
  ];

  it("keeps the departures that could still take this party", () => {
    // A couple fit the small classic in the morning and the yard in the
    // afternoon; five need the van, which only the afternoon still has.
    expect(usableDepartures(day, CLASSIC, 2).map((s) => s.slot)).toEqual([
      "morning",
      "afternoon",
    ]);
    expect(usableDepartures(day, CLASSIC, 5).map((s) => s.slot)).toEqual(["afternoon"]);
    expect(usableDepartures(day, CLASSIC, 9)).toEqual([]);
  });

  it("asks the loose question when no route or party is named", () => {
    // The enquiry form: a day is offered if anything at all is free on it.
    expect(usableDepartures(day).map((s) => s.slot)).toEqual(["morning", "afternoon"]);
    const shut = [{ slot: "morning", driversLeft: 0, vehiclesLeft: FLEET_SIZE }];
    expect(usableDepartures(shut)).toEqual([]);
  });
});

describe("chosenDeparture", () => {
  const both = [{ slot: "morning" }, { slot: "afternoon" }];

  it("keeps the departure the guest picked when it survives", () => {
    expect(chosenDeparture(both, "afternoon")).toBe("afternoon");
  });

  it("takes the only one left rather than asking again", () => {
    expect(chosenDeparture([{ slot: "afternoon" }], null)).toBe("afternoon");
    expect(chosenDeparture([{ slot: "afternoon" }], "morning")).toBe("afternoon");
  });

  it("waits to be asked when the choice is still open, and refuses nonsense", () => {
    expect(chosenDeparture(both, null)).toBeNull();
    expect(chosenDeparture([], "morning")).toBeNull();
    expect(chosenDeparture([{ slot: "midnight" }], null)).toBeNull();
  });
});
