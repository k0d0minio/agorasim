/**
 * The price list, as data — and the arithmetic that turns it into a total.
 *
 * Diogo & Rita sell two tours two ways each, and the ways do not price alike:
 *
 * - **Public** departures are per person: every adult pays a rate that depends
 *   on how many adults are coming (a small group costs more per head than a
 *   full one), children aged 4–12 pay a flat child rate, infants under 4 ride
 *   free.
 * - **Private** departures are the whole car(s): a flat group price looked up
 *   by adult count — with, on Óbidos, a per-adult rate above three — plus a
 *   per-child amount on top. Add-ons exist only here, and only on the
 *   countryside tour: the wine stops charge per adult and carry partner
 *   minimums, the Galapito table charges adults and children differently.
 *
 * This module is that whole offer as one data shape ({@link ExperiencePricing},
 * stored per experience in the catalogue) and one function
 * ({@link priceBooking}) that refuses everything it cannot price exactly. The
 * shape is stored as JSON, so it also owns the door back in:
 * {@link parseExperiencePricing} validates what the database hands over, and
 * anything it cannot vouch for reads as unpriced rather than as a total.
 *
 * **Deliberately pure.** No `server-only`, no imports: the checkout action
 * prices the basket server-side before Stripe sees a cent, and the booking form
 * prices the same basket client-side so the total moves as the guest adds a
 * person — same data, same function, no drift. Nothing computed in the browser
 * is ever charged; the server recomputes from the catalogue (see
 * `checkout-actions.ts`).
 *
 * **Money is integer euro cents everywhere**, as in the rest of the engine.
 */

// ---------------------------------------------------------------------------
// The shape of a price list
// ---------------------------------------------------------------------------

/** Who is coming. Integers; the engine validates. */
export type PartyCount = {
  /** Guests aged 13+. At least one — a child cannot book a tour. */
  adults: number;
  /** Guests aged 4–12. */
  children: number;
  /** Under 4. Free, but they occupy a seat — the cars are small. */
  infants: number;
};

/** Public departure (join others, per person) or private (the cars are yours). */
export type BookingMode = "public" | "private";

/**
 * One row of a tier table, matched on the number of **adults**.
 *
 * Exactly one of `perAdultCents` / `groupCents` is set: the row either prices
 * each adult, or the whole group in one figure. (Diogo's own price table mixes
 * the two — private countryside is a group figure per size, private Óbidos
 * flips to per-adult above three — so the row can say either.)
 */
export type AdultTier = {
  minAdults: number;
  maxAdults: number;
  perAdultCents?: number;
  groupCents?: number;
};

/** How one mode (public or private) of a tour is priced. */
export type TourModePricing = {
  /** Matched on adults; no matching row means the group is too big to sell online. */
  tiers: AdultTier[];
  /**
   * What a child aged 4–12 adds, in cents — a per-child rate on public
   * departures, a per-child surcharge on top of the group figure on private
   * ones. Infants are always free and never appear in a price line.
   */
  childCents: number;
  /** Fewest adults sellable — Óbidos public departures need two. */
  minAdults?: number;
};

/** A bookable tour. */
export type TourPricing = {
  type: "tour";
  public?: TourModePricing;
  private?: TourModePricing & {
    /**
     * Whether add-ons may be attached. True only for the countryside tour:
     * every add-on is a stop on that route, and none of the partners are on
     * the road to Óbidos.
     */
    allowsAddOns?: boolean;
  };
};

/**
 * An add-on stop. Sold only with a **private** tour that
 * {@link TourPricing.private allowsAddOns} — the partners host one group at a
 * time, which is what makes the stop schedulable at all.
 */
export type AddOnPricing = {
  type: "addon";
  perAdultCents: number;
  /**
   * Per child aged 4–12, or `null` when the stop simply is not sold for
   * children (the wine tastings). A `null` never charges and never blocks —
   * children ride along, they just are not tasting.
   */
  childCents: number | null;
  /** Partner minimum counted in adults — Manzwine seats 2+, Ramilo 3+. */
  minAdults?: number;
  /** Partner minimum counted in guests aged 4+ — the Galapito table wants 2. */
  minGuests?: number;
  /**
   * Weekdays the partner does not open, Monday-first (0 = Monday … 6 =
   * Sunday) to match the calendar grid. Manzwine takes Mondays off.
   */
  closedWeekdays?: number[];
};

export type ExperiencePricing = TourPricing | AddOnPricing;

// ---------------------------------------------------------------------------
// A priced basket
// ---------------------------------------------------------------------------

/**
 * One line of a priced booking, frozen at the moment of sale.
 *
 * `unit` says what the quantity counts: adults at a per-adult rate, children
 * at a child rate, or one whole group at a group figure. It is what the
 * summary card, the Stripe line items and the snapshot stored on the booking
 * all render from.
 */
export type PricedLine = {
  slug: string;
  kind: "tour" | "addon";
  unit: "adult" | "child" | "group";
  unitCents: number;
  quantity: number;
};

export type PricedQuote = {
  ok: true;
  lines: PricedLine[];
  totalCents: number;
  /** Seats consumed out of the slot: everyone, infants included. */
  seats: number;
};

/**
 * Every way a basket can fail to price. Each one is a different sentence to
 * say to the guest, so each one is a different value — a bag of booleans here
 * would collapse "Manzwine needs two adults" and "Manzwine is shut on
 * Mondays" into one unhelpful shrug.
 */
export type PricingFailure =
  | { ok: false; reason: "bad-party" }
  | { ok: false; reason: "unpriced"; slug: string }
  | { ok: false; reason: "mode-unavailable"; slug: string; mode: BookingMode }
  | { ok: false; reason: "min-adults"; slug: string; min: number }
  | { ok: false; reason: "party-too-large"; slug: string; maxAdults: number }
  | { ok: false; reason: "addons-not-allowed" }
  | { ok: false; reason: "addon-min-adults"; slug: string; min: number }
  | { ok: false; reason: "addon-min-guests"; slug: string; min: number }
  | { ok: false; reason: "addon-closed-day"; slug: string };

const isCount = (n: number) => Number.isInteger(n) && n >= 0;

/** Monday-first weekday of a `YYYY-MM-DD` key, without importing the calendar. */
export function weekdayOf(dateKey: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  if (!m) return null;
  const date = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  if (Number.isNaN(date.getTime())) return null;
  return (date.getUTCDay() + 6) % 7;
}

function tierFor(tiers: AdultTier[], adults: number): AdultTier | undefined {
  return tiers.find((tier) => adults >= tier.minAdults && adults <= tier.maxAdults);
}

/**
 * Price one basket, or say exactly why not.
 *
 * `date` is optional so the browser can keep a live total before a day is
 * picked; the closed-weekday rule only fires once there is a date to test.
 * The server always passes one — a basket is never *sold* without a date.
 */
export function priceBooking(options: {
  tour: { slug: string; pricing: ExperiencePricing | null | undefined };
  addOns: { slug: string; pricing: ExperiencePricing | null | undefined }[];
  mode: BookingMode;
  party: PartyCount;
  date?: string;
}): PricedQuote | PricingFailure {
  const { tour, addOns, mode, party, date } = options;
  const { adults, children, infants } = party;

  if (!isCount(adults) || !isCount(children) || !isCount(infants) || adults < 1) {
    return { ok: false, reason: "bad-party" };
  }

  if (!tour.pricing || tour.pricing.type !== "tour") {
    return { ok: false, reason: "unpriced", slug: tour.slug };
  }

  const modePricing = tour.pricing[mode];
  if (!modePricing) {
    return { ok: false, reason: "mode-unavailable", slug: tour.slug, mode };
  }
  if (modePricing.minAdults && adults < modePricing.minAdults) {
    return { ok: false, reason: "min-adults", slug: tour.slug, min: modePricing.minAdults };
  }

  const tier = tierFor(modePricing.tiers, adults);
  if (!tier) {
    const maxAdults = Math.max(0, ...modePricing.tiers.map((t) => t.maxAdults));
    return { ok: false, reason: "party-too-large", slug: tour.slug, maxAdults };
  }

  const lines: PricedLine[] = [];

  if (typeof tier.groupCents === "number") {
    lines.push({ slug: tour.slug, kind: "tour", unit: "group", unitCents: tier.groupCents, quantity: 1 });
  } else if (typeof tier.perAdultCents === "number") {
    lines.push({ slug: tour.slug, kind: "tour", unit: "adult", unitCents: tier.perAdultCents, quantity: adults });
  } else {
    // A tier with neither figure is a broken price list, not a free tour.
    return { ok: false, reason: "unpriced", slug: tour.slug };
  }

  if (children > 0) {
    lines.push({ slug: tour.slug, kind: "tour", unit: "child", unitCents: modePricing.childCents, quantity: children });
  }

  if (addOns.length > 0) {
    if (mode !== "private" || !tour.pricing.private?.allowsAddOns) {
      return { ok: false, reason: "addons-not-allowed" };
    }

    for (const addOn of addOns) {
      if (!addOn.pricing || addOn.pricing.type !== "addon") {
        return { ok: false, reason: "unpriced", slug: addOn.slug };
      }
      const p = addOn.pricing;

      if (p.minAdults && adults < p.minAdults) {
        return { ok: false, reason: "addon-min-adults", slug: addOn.slug, min: p.minAdults };
      }
      if (p.minGuests && adults + children < p.minGuests) {
        return { ok: false, reason: "addon-min-guests", slug: addOn.slug, min: p.minGuests };
      }
      if (date && p.closedWeekdays?.length) {
        const weekday = weekdayOf(date);
        if (weekday !== null && p.closedWeekdays.includes(weekday)) {
          return { ok: false, reason: "addon-closed-day", slug: addOn.slug };
        }
      }

      lines.push({ slug: addOn.slug, kind: "addon", unit: "adult", unitCents: p.perAdultCents, quantity: adults });
      if (children > 0 && typeof p.childCents === "number") {
        lines.push({ slug: addOn.slug, kind: "addon", unit: "child", unitCents: p.childCents, quantity: children });
      }
    }
  }

  return {
    ok: true,
    lines,
    totalCents: lines.reduce((sum, line) => sum + line.unitCents * line.quantity, 0),
    seats: adults + children + infants,
  };
}

// ---------------------------------------------------------------------------
// Reading a price list back out of storage
// ---------------------------------------------------------------------------

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** Absent, in JSON, is either missing or explicitly null. */
const isAbsent = (value: unknown): boolean => value === undefined || value === null;

/** Money, as the rest of the engine holds it: whole euro cents, never negative. */
const isCents = (value: unknown): value is number =>
  typeof value === "number" && Number.isInteger(value) && value >= 0;

/** A count of people. Zero adults is not a group, so tiers start at one. */
const isHeadcount = (value: unknown): value is number =>
  typeof value === "number" && Number.isInteger(value) && value >= 1;

/** Monday-first weekday, as {@link weekdayOf} returns. */
const isWeekday = (value: unknown): value is number =>
  typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 6;

/**
 * A price list is stored as JSON (`experiences.pricing`), and JSON is a shape
 * nothing enforces: the column is typed in Drizzle, but Postgres will hold
 * whatever a migration or a future pricing editor wrote there, and TypeScript
 * believes the annotation without ever looking.
 *
 * So everything that reads that column reads it through here. A value that
 * does not answer every question {@link priceBooking} will ask comes back as
 * `null` — **unpriced**, which the site already handles: the tour still
 * renders, the checkout stands down and the enquiry form takes the lead. That
 * is the safe direction. Half-parsing a price list would mean charging a guest
 * a number nobody wrote.
 */
export function parseExperiencePricing(value: unknown): ExperiencePricing | null {
  if (!isRecord(value)) return null;
  if (value.type === "tour") return parseTourPricing(value);
  if (value.type === "addon") return parseAddOnPricing(value);
  return null;
}

function parseAdultTier(value: unknown): AdultTier | null {
  if (!isRecord(value)) return null;
  const { minAdults, maxAdults, perAdultCents, groupCents } = value;

  if (!isHeadcount(minAdults) || !isHeadcount(maxAdults)) return null;
  // A band that ends before it starts matches nobody — and a price list with a
  // hole in it is one a guest falls through.
  if (minAdults > maxAdults) return null;

  if (!isAbsent(perAdultCents) && !isCents(perAdultCents)) return null;
  if (!isAbsent(groupCents) && !isCents(groupCents)) return null;

  const tier: AdultTier = { minAdults, maxAdults };
  if (isCents(perAdultCents)) tier.perAdultCents = perAdultCents;
  if (isCents(groupCents)) tier.groupCents = groupCents;

  // A tier that prices neither the head nor the group is a broken row, not a
  // free tour — `priceBooking` refuses it, so refuse it here where it is cheap.
  if (tier.perAdultCents === undefined && tier.groupCents === undefined) return null;
  return tier;
}

function parseTourMode(value: unknown): TourModePricing | null {
  if (!isRecord(value)) return null;
  const { tiers, childCents, minAdults } = value;

  if (!Array.isArray(tiers) || tiers.length === 0) return null;
  const parsed: AdultTier[] = [];
  for (const raw of tiers) {
    const tier = parseAdultTier(raw);
    if (!tier) return null;
    parsed.push(tier);
  }

  if (!isCents(childCents)) return null;
  if (!isAbsent(minAdults) && !isHeadcount(minAdults)) return null;

  const mode: TourModePricing = { tiers: parsed, childCents };
  if (isHeadcount(minAdults)) mode.minAdults = minAdults;
  return mode;
}

function parseTourPricing(value: Record<string, unknown>): TourPricing | null {
  const pricing: TourPricing = { type: "tour" };

  if (!isAbsent(value.public)) {
    const mode = parseTourMode(value.public);
    if (!mode) return null;
    pricing.public = mode;
  }

  if (!isAbsent(value.private)) {
    const mode = parseTourMode(value.private);
    if (!mode) return null;
    // Add-ons are opt-in per tour: only the countryside route passes any of the
    // partners, so anything short of an explicit `true` means no.
    pricing.private =
      isRecord(value.private) && value.private.allowsAddOns === true
        ? { ...mode, allowsAddOns: true }
        : mode;
  }

  // Neither mode is not "free": it is a tour with no way to buy it.
  if (!pricing.public && !pricing.private) return null;
  return pricing;
}

function parseAddOnPricing(value: Record<string, unknown>): AddOnPricing | null {
  const { perAdultCents, childCents, minAdults, minGuests, closedWeekdays } = value;

  if (!isCents(perAdultCents)) return null;
  if (!isAbsent(childCents) && !isCents(childCents)) return null;
  if (!isAbsent(minAdults) && !isHeadcount(minAdults)) return null;
  if (!isAbsent(minGuests) && !isHeadcount(minGuests)) return null;
  if (
    !isAbsent(closedWeekdays) &&
    !(Array.isArray(closedWeekdays) && closedWeekdays.every(isWeekday))
  ) {
    return null;
  }

  const addOn: AddOnPricing = {
    type: "addon",
    perAdultCents,
    // A stop that is simply not sold for children reads the same as one that
    // never said: children ride along, and nothing charges for them.
    childCents: isCents(childCents) ? childCents : null,
  };
  if (isHeadcount(minAdults)) addOn.minAdults = minAdults;
  if (isHeadcount(minGuests)) addOn.minGuests = minGuests;
  if (Array.isArray(closedWeekdays)) addOn.closedWeekdays = [...closedWeekdays];
  return addOn;
}

// ---------------------------------------------------------------------------
// Display helpers
// ---------------------------------------------------------------------------

/**
 * The "from €—" figure a card shows: the cheapest per-adult rate the
 * experience is sold at, or — for a tour sold privately only — the smallest
 * group figure with `perGroup` set so the caption can say so.
 */
export function fromPrice(
  pricing: ExperiencePricing | null | undefined,
): { cents: number; perGroup: boolean } | null {
  if (!pricing) return null;

  if (pricing.type === "addon") {
    return { cents: pricing.perAdultCents, perGroup: false };
  }

  const perAdult: number[] = [];
  const perGroup: number[] = [];
  for (const mode of [pricing.public, pricing.private]) {
    for (const tier of mode?.tiers ?? []) {
      if (typeof tier.perAdultCents === "number") perAdult.push(tier.perAdultCents);
      else if (typeof tier.groupCents === "number") perGroup.push(tier.groupCents);
    }
  }

  if (perAdult.length > 0) return { cents: Math.min(...perAdult), perGroup: false };
  if (perGroup.length > 0) return { cents: Math.min(...perGroup), perGroup: true };
  return null;
}

/**
 * The cheapest and dearest figure the experience is sold at, in cents — what
 * the page's `AggregateOffer` publishes as its low and high price.
 *
 * Every tier figure counts, per-adult and per-group alike, because each one is
 * genuinely an offer a guest can buy: the countryside tour runs from €58 a head
 * on a per-person booking to €700 for twelve adults in private. Child rates are
 * left out — a child rate is never a price on its own, only an addition to one.
 */
export function priceRange(
  pricing: ExperiencePricing | null | undefined,
): { lowCents: number; highCents: number } | null {
  if (!pricing) return null;
  if (pricing.type === "addon") {
    return { lowCents: pricing.perAdultCents, highCents: pricing.perAdultCents };
  }

  const figures: number[] = [];
  for (const mode of [pricing.public, pricing.private]) {
    for (const tier of mode?.tiers ?? []) {
      if (typeof tier.perAdultCents === "number") figures.push(tier.perAdultCents);
      if (typeof tier.groupCents === "number") figures.push(tier.groupCents);
    }
  }

  if (figures.length === 0) return null;
  return { lowCents: Math.min(...figures), highCents: Math.max(...figures) };
}

/** Whether an experience has a usable price list at all. */
export function isPriced(pricing: ExperiencePricing | null | undefined): boolean {
  if (!pricing) return false;
  if (pricing.type === "addon") return pricing.perAdultCents > 0;
  return Boolean(pricing.public ?? pricing.private);
}

/** The most adults any tier of any mode will sell — the stepper's ceiling. */
export function maxAdultsOf(pricing: ExperiencePricing | null | undefined): number {
  if (!pricing || pricing.type !== "tour") return 0;
  return Math.max(
    0,
    ...(pricing.public?.tiers ?? []).map((tier) => tier.maxAdults),
    ...(pricing.private?.tiers ?? []).map((tier) => tier.maxAdults),
  );
}

/**
 * The whole price list in one admin-readable sentence — what the catalogue
 * editor shows instead of an input, until the pricing editor exists.
 */
export function describePricing(pricing: ExperiencePricing | null | undefined): string | null {
  if (!pricing) return null;
  const euros = (cents: number) => `€${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;

  if (pricing.type === "addon") {
    const parts = [`${euros(pricing.perAdultCents)}/adulto`];
    if (typeof pricing.childCents === "number") {
      parts.push(`criança ${euros(pricing.childCents)}`);
    }
    if (pricing.minAdults) parts.push(`mín. ${pricing.minAdults} adultos`);
    if (pricing.minGuests) parts.push(`mín. ${pricing.minGuests} pessoas`);
    if (pricing.closedWeekdays?.length) parts.push("fechado à segunda-feira");
    return `Extra (só no rural privado): ${parts.join(" · ")}`;
  }

  const modeLine = (label: string, mode: TourModePricing | undefined): string | null => {
    if (!mode) return null;
    const perAdult = mode.tiers
      .map((tier) => tier.perAdultCents)
      .filter((cents): cents is number => typeof cents === "number");
    const group = mode.tiers
      .map((tier) => tier.groupCents)
      .filter((cents): cents is number => typeof cents === "number");
    const parts: string[] = [];
    if (perAdult.length > 0) {
      const min = Math.min(...perAdult);
      const max = Math.max(...perAdult);
      parts.push(min === max ? `${euros(min)}/adulto` : `${euros(max)}–${euros(min)}/adulto`);
    }
    if (group.length > 0) {
      const min = Math.min(...group);
      const max = Math.max(...group);
      parts.push(
        min === max
          ? `${euros(min)}/grupo`
          : `${euros(min)}–${euros(max)}/grupo consoante os adultos`,
      );
    }
    parts.push(`criança ${euros(mode.childCents)}`);
    if (mode.minAdults) parts.push(`mín. ${mode.minAdults} adultos`);
    return `${label}: ${parts.join(", ")}`;
  };

  return [modeLine("Partilhado", pricing.public), modeLine("Privado", pricing.private)]
    .filter(Boolean)
    .join(" · ");
}
