import { describe, expect, it } from "vitest";

import {
  anyVehicleFree,
  assignVehicle,
  carChoices,
  CLASS_SEATS,
  DRIVERS_PER_SLOT,
  FLEET,
  FLEET_SIZE,
  freeSeats,
  joinableCar,
  MAX_PARTY_ONLINE,
  mostOpenSeats,
  noVehicles,
  remainingVehicles,
  routeKindOf,
  slotFitsParty,
  VEHICLE_CLASSES,
  type OpenCar,
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
 * The open group tour: per-person parties of one tour share a car while it has
 * the seats. Every case is a car at its seat limit — the line where a wrong
 * answer puts a fourth guest in a 2CV or sends a second driver out for one.
 */
describe("open cars", () => {
  const car = (overrides: Partial<OpenCar> = {}): OpenCar => ({
    id: "car-a",
    experienceSlug: CLASSIC,
    vehicleClass: "classic-small",
    seatsTaken: 2,
    ...overrides,
  });

  it("counts the seats a car can still sell, never below zero", () => {
    expect(freeSeats(car())).toBe(1);
    expect(freeSeats(car({ seatsTaken: 3 }))).toBe(0);
    expect(freeSeats(car({ vehicleClass: "classic-van", seatsTaken: 4 }))).toBe(4);
    expect(freeSeats(car({ seatsTaken: 5 }))).toBe(0);
  });

  it("seats a party in an open car with exactly the seats it needs", () => {
    expect(joinableCar([car()], CLASSIC, 1)?.id).toBe("car-a");
  });

  it("never seats a party in a car one seat short, nor splits it", () => {
    expect(joinableCar([car()], CLASSIC, 2)).toBeNull();
    expect(joinableCar([car({ seatsTaken: 3 })], CLASSIC, 1)).toBeNull();
  });

  it("never seats a party in a car on another route", () => {
    expect(joinableCar([car({ experienceSlug: TOURING })], CLASSIC, 1)).toBeNull();
  });

  it("fills the tightest car first, and breaks a tie by id", () => {
    const van = car({ id: "car-van", vehicleClass: "classic-van", seatsTaken: 4 });
    const twoCv = car({ id: "car-2cv", seatsTaken: 1 });
    // A couple fits both. The 2CV's two seats go first; the T3 keeps four.
    expect(joinableCar([van, twoCv], CLASSIC, 2)?.id).toBe("car-2cv");
    const twin = car({ id: "car-0", seatsTaken: 1 });
    expect(joinableCar([twoCv, twin], CLASSIC, 2)?.id).toBe("car-0");
  });

  it("tells the browser the most seats one car of each tour can sell", () => {
    expect(
      mostOpenSeats([
        car({ id: "a", seatsTaken: 2 }),
        car({ id: "b", seatsTaken: 1 }),
        car({ id: "c", experienceSlug: TOURING, vehicleClass: "touring", seatsTaken: 8 }),
      ]),
    ).toEqual({ [CLASSIC]: 2 });
  });
});

describe("slotFitsParty, per person", () => {
  const out = { driversLeft: 0, vehiclesLeft: noVehicles() };

  it("seats a per-person party in an open car with every driver out", () => {
    expect(slotFitsParty({ ...out, openSeats: { [CLASSIC]: 1 } }, CLASSIC, 1, "public")).toBe(
      true,
    );
  });

  it("refuses the seat a party is one short of", () => {
    expect(slotFitsParty({ ...out, openSeats: { [CLASSIC]: 1 } }, CLASSIC, 2, "public")).toBe(
      false,
    );
  });

  it("never seats a private group in an open car", () => {
    expect(slotFitsParty({ ...out, openSeats: { [CLASSIC]: 3 } }, CLASSIC, 1, "private")).toBe(
      false,
    );
    // Private is the default: a caller that does not say never shares.
    expect(slotFitsParty({ ...out, openSeats: { [CLASSIC]: 3 } }, CLASSIC, 1)).toBe(false);
  });

  it("still sends a per-person party to a car of its own when none has room", () => {
    const free = { driversLeft: 1, vehiclesLeft: FLEET_SIZE, openSeats: { [CLASSIC]: 1 } };
    expect(slotFitsParty(free, CLASSIC, 4, "public")).toBe(true);
  });
});

describe("carChoices", () => {
  const party = { sharedCarId: "car-a", experienceSlug: CLASSIC, partySize: 1 };
  const free = { driversLeft: 1, vehiclesLeft: FLEET_SIZE };
  const cars: OpenCar[] = [
    { id: "car-a", experienceSlug: CLASSIC, vehicleClass: "classic-small", seatsTaken: 3 },
    { id: "car-b", experienceSlug: CLASSIC, vehicleClass: "classic-small", seatsTaken: 2 },
    { id: "car-c", experienceSlug: CLASSIC, vehicleClass: "classic-small", seatsTaken: 3 },
    { id: "car-d", experienceSlug: TOURING, vehicleClass: "touring", seatsTaken: 2 },
  ];

  it("offers the other cars of the tour with room, and a new car", () => {
    const choices = carChoices({ cars, party, free });
    expect(choices.join.map((car) => car.id)).toEqual(["car-b"]);
    expect(choices.canOpenNew).toBe(true);
  });

  it("offers no new car without a free driver, nor to a party alone in its car", () => {
    expect(carChoices({ cars, party, free: { ...free, driversLeft: 0 } }).canOpenNew).toBe(
      false,
    );
    const alone = { ...party, sharedCarId: "car-b", partySize: 2 };
    expect(carChoices({ cars, party: alone, free }).canOpenNew).toBe(false);
  });
});
