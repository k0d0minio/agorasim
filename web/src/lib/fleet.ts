/**
 * The fleet, and the two things it is scarce in: **drivers and cars**.
 *
 * This is the correction AGORA-012 exists for. The booking engine used to model
 * a calendar *per tour* — opening a Saturday morning for Rural Saloia said
 * nothing about Óbidos, and both tours could sell the same morning to different
 * people. That is not the business. Diogo & Rita are **two drivers across four
 * classic cars** (info PDF §1.5): at most two tours can leave at once, in either
 * of the two daily slots, *across the whole offer*. A Rural Saloia booking at
 * 10:00 consumes a driver the Óbidos tour can no longer use.
 *
 * So capacity is a pair of pools per (day, departure):
 *
 * - **Drivers** — how many tours can leave at all. Two, and Rita can say fewer
 *   for a given departure from the calendar.
 * - **Vehicles** — which car the party actually needs, by class. Three small
 *   classics carry 3 guests each, the VW T3 carries 8, and the Óbidos route
 *   runs in a non-classic touring vehicle (§2.6) so that it consumes a driver
 *   **without** ever taking a classic off the Saloia routes.
 *
 * **One booking is one driver and one vehicle.** That is true because
 * everything that would need two of either is refused — see
 * {@link MAX_PARTY_ONLINE}. Their stated maximum is 14 guests by combining
 * cars, but 14 needs a third car and therefore a third driver, and who drives
 * it is an open question with the client (AGORA-019). Guessing it here would
 * be guessing a person into existence, so parties above 8 are sent to the
 * enquiry form instead until that answer comes back.
 *
 * **A per-person booking shares its car; a group booking does not.** Diogo
 * sells an *open* group tour — other people can join the same car — and a
 * private one (feedback round 1, 2026-10-12). So a `public` booking joins a car
 * of the same tour on the same departure that already carries `public` guests,
 * when that car has the seats, and takes a car of its own only when none has
 * room ({@link joinableCar}). A `private` booking takes its car whole, as every
 * booking did before. One car is still one driver, however many parties ride
 * in it.
 *
 * **Deliberately pure.** No `server-only`, no imports: the availability engine
 * runs this server-side to decide what may be sold, and the booking form runs
 * the same functions in the browser to grey out what cannot be — same data,
 * same rule, no drift. `lib/pricing.ts` is pure for exactly the same reason.
 */

/**
 * What kind of vehicle a booking needs.
 *
 * A class, not a registration plate: which of the three small classics goes
 * out is Diogo's call on the morning, and a booking engine that assigned
 * "the 2CV" would be inventing a decision nobody asked it to make. What it has
 * to get right is that a fourth party of three cannot be sold a small classic
 * when only three exist.
 */
export type VehicleClass = "classic-small" | "classic-van" | "touring";

export const VEHICLE_CLASSES = [
  "classic-small",
  "classic-van",
  "touring",
] as const satisfies readonly VehicleClass[];

export function isVehicleClass(value: unknown): value is VehicleClass {
  return (VEHICLE_CLASSES as readonly string[]).includes(value as string);
}

/** One car on the road, as the team would name it. */
export type Vehicle = {
  id: string;
  /**
   * What it is called out loud — the admin calendar's legend reads this, and
   * only the admin calendar does, so it is written in Portuguese like the rest
   * of that console. Four of the five are proper nouns and read the same in
   * either language.
   */
  name: string;
  class: VehicleClass;
  /** Guests it carries. Everyone counts, infants included: the cars are small. */
  seats: number;
};

/**
 * The real fleet (info PDF §1.5, §2.6).
 *
 * The touring vehicle's exact seat count is not in the sources, and it is not
 * needed either: nothing above {@link MAX_PARTY_ONLINE} is sellable online
 * until AGORA-019 settles the big-group rule, so it is recorded at that
 * ceiling rather than at a number nobody gave us. When the answer arrives it
 * replaces this line, and the arithmetic around it does not change.
 */
export const FLEET: readonly Vehicle[] = [
  { id: "citroen-2cv", name: "Citroën 2CV", class: "classic-small", seats: 3 },
  { id: "renault-4l", name: "Renault 4L", class: "classic-small", seats: 3 },
  { id: "fiat-600", name: "Fiat 600", class: "classic-small", seats: 3 },
  { id: "vw-t3", name: "VW T3", class: "classic-van", seats: 8 },
  { id: "touring", name: "Viatura de turismo", class: "touring", seats: 8 },
];

/** How many of each class exist. The denominator of every vehicle pool. */
export const FLEET_SIZE: Record<VehicleClass, number> = VEHICLE_CLASSES.reduce(
  (sizes, vehicleClass) => {
    sizes[vehicleClass] = FLEET.filter((car) => car.class === vehicleClass).length;
    return sizes;
  },
  { "classic-small": 0, "classic-van": 0, touring: 0 } as Record<VehicleClass, number>,
);

/** The most guests one vehicle of a class can carry. */
export const CLASS_SEATS: Record<VehicleClass, number> = VEHICLE_CLASSES.reduce(
  (seats, vehicleClass) => {
    seats[vehicleClass] = Math.max(
      0,
      ...FLEET.filter((car) => car.class === vehicleClass).map((car) => car.seats),
    );
    return seats;
  },
  { "classic-small": 0, "classic-van": 0, touring: 0 } as Record<VehicleClass, number>,
);

/**
 * Drivers on a normal departure. **Two, business-wide** — not two per tour.
 *
 * Rita can lower it for one departure from the calendar (someone is at a
 * wedding, someone is ill). She cannot raise it: a third driver is precisely
 * the open question in AGORA-019, and a stepper that went to three would be
 * this file quietly answering it.
 */
export const DRIVERS_PER_SLOT = 2;

/** The ceiling the roster stepper stops at. See {@link DRIVERS_PER_SLOT}. */
export const MAX_DRIVERS_PER_SLOT = DRIVERS_PER_SLOT;

/**
 * The largest party the site sells online: **8**, the VW T3's seats.
 *
 * Nine guests need two vehicles and therefore two drivers, which is both
 * drivers on one booking — and the team's stated 14 needs three of each. Both
 * are real business, and both are a conversation rather than a checkout until
 * AGORA-019 says who drives the third car. Above this the form points at the
 * enquiry form, which is the lead the team actually wants for a group that
 * size.
 */
export const MAX_PARTY_ONLINE = 8;

// ---------------------------------------------------------------------------
// Which car a tour needs
// ---------------------------------------------------------------------------

/**
 * What a route is driven in. `classic` is the Saloia offer — the cars *are*
 * the experience; `touring` is Óbidos, which departs from Lisbon in a
 * comfortable non-classic vehicle (§2.6) and so never touches the classics.
 */
export type RouteKind = "classic" | "touring";

/**
 * Routes that are not driven in the classic cars, by slug.
 *
 * A set rather than a column on the catalogue: which vehicle a route needs is
 * a fact about the road to Óbidos, not something the catalogue editor should
 * be able to change from a phone and accidentally re-point at the 2CV. A route
 * this set does not name is a classic-car route, which is the whole of the
 * Saloia offer and the safe default — it consumes the scarcer pool.
 */
export const TOURING_ROUTES: ReadonlySet<string> = new Set(["obidos-medieval-villages"]);

export function routeKindOf(experienceSlug: string): RouteKind {
  return TOURING_ROUTES.has(experienceSlug) ? "touring" : "classic";
}

/** The vehicle a booking needs, or exactly why it cannot have one. */
export type VehicleAssignment =
  | { ok: true; vehicleClass: VehicleClass }
  | { ok: false; reason: "empty-party" }
  | { ok: false; reason: "party-too-large"; max: number };

/**
 * Which car this party needs on this route.
 *
 * The rule the ticket sets out, and the only place it is written down: up to
 * three guests take one small classic, four to eight take the T3, and nine or
 * more is refused until AGORA-019. Óbidos takes the touring vehicle whatever
 * the party size, which is what stops it depleting the classic fleet.
 *
 * Party size is *everyone*, infants included — an infant occupies a seat in a
 * 2CV exactly as much as an adult does.
 */
export function assignVehicle(
  experienceSlug: string,
  partySize: number,
): VehicleAssignment {
  if (!Number.isInteger(partySize) || partySize < 1) {
    return { ok: false, reason: "empty-party" };
  }
  if (partySize > MAX_PARTY_ONLINE) {
    return { ok: false, reason: "party-too-large", max: MAX_PARTY_ONLINE };
  }
  if (routeKindOf(experienceSlug) === "touring") {
    return partySize <= CLASS_SEATS.touring
      ? { ok: true, vehicleClass: "touring" }
      : { ok: false, reason: "party-too-large", max: CLASS_SEATS.touring };
  }
  return partySize <= CLASS_SEATS["classic-small"]
    ? { ok: true, vehicleClass: "classic-small" }
    : { ok: true, vehicleClass: "classic-van" };
}

// ---------------------------------------------------------------------------
// Pools
// ---------------------------------------------------------------------------

/** A count per vehicle class — free ones, or committed ones. */
export type VehicleCounts = Record<VehicleClass, number>;

/** A fresh all-zero tally. Never share one: callers add to it. */
export function noVehicles(): VehicleCounts {
  return { "classic-small": 0, "classic-van": 0, touring: 0 };
}

/** `a - b` per class, floored at zero. What is left of a pool. */
export function remainingVehicles(
  fleet: VehicleCounts,
  used: VehicleCounts,
): VehicleCounts {
  const left = noVehicles();
  for (const vehicleClass of VEHICLE_CLASSES) {
    left[vehicleClass] = Math.max(0, fleet[vehicleClass] - used[vehicleClass]);
  }
  return left;
}

/** Whether any vehicle at all is free. */
export function anyVehicleFree(free: VehicleCounts): boolean {
  return VEHICLE_CLASSES.some((vehicleClass) => free[vehicleClass] > 0);
}

// ---------------------------------------------------------------------------
// Open cars — the per-person tour, shared
// ---------------------------------------------------------------------------

/**
 * Which half of the price list a party buys from, and so whether it shares.
 *
 * `public` is the open group tour, priced per person: it rides with other
 * `public` parties of the same tour. `private` is the group tour: a car of its
 * own. The same two words as `BookingMode` in `lib/pricing.ts`, restated
 * because this file imports nothing.
 */
export type SeatingMode = "public" | "private";

/**
 * One open car on a departure: a car that carries `public` parties of one tour.
 *
 * Its id is `bookings.shared_car_id`, the label its parties have in common. A
 * car is not a row of its own, so what it carries is the sum of the parties
 * that wear its id.
 */
export type OpenCar = {
  id: string;
  /** The tour it drives. A party on another route never rides in it. */
  experienceSlug: string;
  vehicleClass: VehicleClass;
  /** Guests already aboard, infants included — they take a seat like anyone. */
  seatsTaken: number;
};

/** Seats an open car can still sell. Never negative. */
export function freeSeats(car: Pick<OpenCar, "vehicleClass" | "seatsTaken">): number {
  return Math.max(0, CLASS_SEATS[car.vehicleClass] - car.seatsTaken);
}

/**
 * The open car a `public` party joins, or `null` when no car of its tour has
 * room for the whole party.
 *
 * The tightest fit wins: a couple joins the 2CV with one guest aboard before
 * the T3 with four, so the T3's seats stay for a party only the T3 can take.
 * Ties go to the lower id, so the server and a test agree on which car.
 * A party is never split across two cars.
 */
export function joinableCar<Car extends OpenCar>(
  cars: readonly Car[],
  experienceSlug: string,
  partySize: number,
): Car | null {
  let best: Car | null = null;
  for (const car of cars) {
    if (car.experienceSlug !== experienceSlug) continue;
    const free = freeSeats(car);
    if (free < partySize) continue;
    if (!best) {
      best = car;
      continue;
    }
    const bestFree = freeSeats(best);
    if (free < bestFree || (free === bestFree && car.id < best.id)) best = car;
  }
  return best;
}

/**
 * The most seats one open car of each tour can still sell — what a guest's
 * browser needs to know about the open cars, and all it is told.
 *
 * A party fits an open car when it fits the emptiest one, so the largest
 * figure per tour answers the browser's question without a car id or a
 * stranger's party size in the payload. Tours with no free seat are left out.
 */
export function mostOpenSeats(cars: readonly OpenCar[]): Record<string, number> {
  const most: Record<string, number> = {};
  for (const car of cars) {
    const free = freeSeats(car);
    if (free > (most[car.experienceSlug] ?? 0)) most[car.experienceSlug] = free;
  }
  return most;
}

/**
 * Whether a departure with these pools free can take this party on this route.
 *
 * Shared by both sides on purpose: the server decides what may be sold with
 * it, and the browser greys out the days that would say no with the very same
 * function, over the very same numbers from the public payload. The two cannot
 * disagree about a Saturday because there is only one rule.
 *
 * A `public` party also fits when an open car of its tour has the seats
 * ({@link mostOpenSeats}) — it rides there and needs no driver or car of its
 * own. `mode` defaults to `private`, the stricter answer, so a caller that does
 * not say never sells a seat in a stranger's car.
 */
export function slotFitsParty(
  free: {
    driversLeft: number;
    vehiclesLeft: VehicleCounts;
    openSeats?: Readonly<Record<string, number>>;
  },
  experienceSlug: string,
  partySize: number,
  mode: SeatingMode = "private",
): boolean {
  const assignment = assignVehicle(experienceSlug, partySize);
  if (!assignment.ok) return false;
  if (mode === "public" && (free.openSeats?.[experienceSlug] ?? 0) >= partySize) {
    return true;
  }
  return free.driversLeft >= 1 && free.vehiclesLeft[assignment.vehicleClass] > 0;
}

/**
 * Where the team may move one `public` party on its own departure — "Mudar de
 * carro" on the day sheet.
 *
 * - `join`: the other open cars of its tour with room for the whole party.
 * - `canOpenNew`: a driver and a car of the class the party needs are free, and
 *   the party is not alone in its car already (alone, a new car changes
 *   nothing but the label).
 *
 * Pure, so the day sheet offers exactly what the server action accepts.
 */
export function carChoices<Car extends OpenCar>(options: {
  cars: readonly Car[];
  /** The party being moved, in the car it rides in now. */
  party: { sharedCarId: string; experienceSlug: string; partySize: number };
  free: { driversLeft: number; vehiclesLeft: VehicleCounts };
}): { join: Car[]; canOpenNew: boolean } {
  const { cars, party, free } = options;
  const current = cars.find((car) => car.id === party.sharedCarId);
  const join = cars.filter(
    (car) =>
      car.id !== party.sharedCarId &&
      car.experienceSlug === party.experienceSlug &&
      freeSeats(car) >= party.partySize,
  );
  const assignment = assignVehicle(party.experienceSlug, party.partySize);
  const alone = !current || current.seatsTaken <= party.partySize;
  const canOpenNew =
    assignment.ok &&
    !alone &&
    free.driversLeft >= 1 &&
    free.vehiclesLeft[assignment.vehicleClass] > 0;
  return { join, canOpenNew };
}
