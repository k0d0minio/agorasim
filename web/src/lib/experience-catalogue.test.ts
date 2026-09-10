import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ExperienceRow } from "@/db/schema";
import {
  getCatalogueEntry,
  listCatalogue,
  listExperiences,
} from "@/lib/experience-catalogue";
import { captureError } from "@/lib/observability";
import { isPriced, priceBooking, type ExperiencePricing } from "@/lib/pricing";

/**
 * The resolver between the `experiences` table and everything that renders an
 * experience — and, since `toEntry()` once dropped the `pricing` column on the
 * floor, the place where the paid checkout quietly died.
 *
 * That bug had no failing test to find it: every row came back with
 * `pricing: undefined`, `/reservar` filtered on `isPriced()` and found no
 * sellable tour, and the site fell back to the enquiry form exactly as it is
 * designed to when nothing is priced. The site looked fine. It just could not
 * take money. So the tests below are about the mapping surviving, not about
 * arithmetic — `pricing.test.ts` owns the arithmetic.
 *
 * The database is mocked at the `@/db` boundary (the query builder is a stub;
 * the schema is the real one, so `asc()`/`eq()` get real columns).
 */

const { table } = vi.hoisted(() => ({
  table: { rows: [] as unknown[], error: null as Error | null },
}));

vi.mock("@/db", async () => {
  const schema = await vi.importActual<typeof import("@/db/schema")>("@/db/schema");

  const rows = () =>
    table.error ? Promise.reject(table.error) : Promise.resolve(table.rows);

  type Query = {
    from: () => Query;
    where: () => Query;
    orderBy: () => Promise<unknown[]>;
    limit: () => Promise<unknown[]>;
  };
  const query: Query = {
    from: () => query,
    where: () => query,
    orderBy: rows,
    limit: rows,
  };

  return { ...schema, db: { select: () => query } };
});

// The alarm an outage pulls. A stand-in: what is asserted is whether the
// resolver pulled it, and when — not whether Sentry heard.
vi.mock("@/lib/observability", () => ({ captureError: vi.fn() }));

/**
 * The price lists as `drizzle/0012_real_prices_two_tours.sql` seeds them —
 * copied verbatim from the migration and parsed the way the driver hands
 * `jsonb` back, so a change to either side has to be a deliberate one.
 */
const SEEDED = {
  ruralSaloia: JSON.parse(
    '{"type":"tour","public":{"tiers":[{"minAdults":1,"maxAdults":3,"perAdultCents":6200},{"minAdults":4,"maxAdults":12,"perAdultCents":5800}],"childCents":3500},"private":{"tiers":[{"minAdults":1,"maxAdults":3,"groupCents":22000},{"minAdults":4,"maxAdults":4,"groupCents":29000},{"minAdults":5,"maxAdults":5,"groupCents":35000},{"minAdults":6,"maxAdults":6,"groupCents":40000},{"minAdults":7,"maxAdults":7,"groupCents":45000},{"minAdults":8,"maxAdults":8,"groupCents":50000},{"minAdults":9,"maxAdults":9,"groupCents":55000},{"minAdults":10,"maxAdults":10,"groupCents":60000},{"minAdults":11,"maxAdults":11,"groupCents":65000},{"minAdults":12,"maxAdults":12,"groupCents":70000}],"childCents":3000,"allowsAddOns":true}}',
  ) as ExperiencePricing,
  obidos: JSON.parse(
    '{"type":"tour","public":{"tiers":[{"minAdults":2,"maxAdults":12,"perAdultCents":10000}],"childCents":4000,"minAdults":2},"private":{"tiers":[{"minAdults":1,"maxAdults":3,"groupCents":36000},{"minAdults":4,"maxAdults":12,"perAdultCents":11000}],"childCents":4000}}',
  ) as ExperiencePricing,
  manzwine: JSON.parse(
    '{"type":"addon","perAdultCents":3500,"childCents":null,"minAdults":2,"closedWeekdays":[0]}',
  ) as ExperiencePricing,
};

const localized = { pt: "pt", en: "en" };

function row(overrides: Partial<ExperienceRow> = {}): ExperienceRow {
  return {
    id: "00000000-0000-0000-0000-000000000001",
    slug: "rural-saloia",
    kind: "signature",
    icon: "car",
    title: localized,
    tagline: localized,
    summary: localized,
    description: { pt: ["pt"], en: ["en"] },
    duration: localized,
    highlights: { pt: ["pt"], en: ["en"] },
    faqs: [],
    image: "/images/hero.webp",
    imageAlt: localized,
    priceCents: null,
    pricing: null,
    active: true,
    sortOrder: 0,
    createdAt: new Date("2026-08-01T00:00:00Z"),
    updatedAt: new Date("2026-08-01T00:00:00Z"),
    ...overrides,
  };
}

beforeEach(() => {
  table.rows = [];
  table.error = null;
  vi.restoreAllMocks();
});

describe("mapping a database row", () => {
  it("carries the seeded price list through, untouched", async () => {
    table.rows = [row({ pricing: SEEDED.ruralSaloia })];

    const [entry] = await listCatalogue();

    expect(entry.pricing).toEqual(SEEDED.ruralSaloia);
    expect(isPriced(entry.pricing)).toBe(true);
    // The 62€/adult small-group rate of the prices PDF, reached from a row.
    expect(
      priceBooking({
        tour: { slug: entry.slug, pricing: entry.pricing },
        addOns: [],
        mode: "public",
        party: { adults: 2, children: 0, infants: 0 },
      }),
    ).toMatchObject({ ok: true, totalCents: 12400 });
  });

  it("carries an add-on's price list through too, `null` child rate and all", async () => {
    table.rows = [row({ slug: "manzwine", kind: "complement", pricing: SEEDED.manzwine })];

    const [entry] = await listCatalogue();

    expect(entry.pricing).toEqual(SEEDED.manzwine);
  });

  it("maps pricing on the single-slug read as well", async () => {
    table.rows = [row({ pricing: SEEDED.ruralSaloia })];

    const entry = await getCatalogueEntry("rural-saloia");

    expect(isPriced(entry?.pricing)).toBe(true);
  });

  it("leaves an unpriced row unpriced, quietly", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    table.rows = [row({ pricing: null })];

    const [entry] = await listCatalogue();

    expect(entry.pricing).toBeNull();
    expect(isPriced(entry.pricing)).toBe(false);
    // A price nobody has set yet is the normal state of a new experience, not
    // something to shout about — only an unreadable one is.
    expect(warn).not.toHaveBeenCalled();
  });
});

describe("what /reservar asks the catalogue", () => {
  /** The page's own filter: a tour it can sell is a priced signature entry. */
  const sellableTours = (entries: { kind: string; pricing?: ExperiencePricing | null }[]) =>
    entries.filter((entry) => entry.kind === "signature" && isPriced(entry.pricing));

  it("finds both seeded tours, so the checkout form renders", async () => {
    table.rows = [
      row({ pricing: SEEDED.ruralSaloia }),
      row({
        id: "00000000-0000-0000-0000-000000000002",
        slug: "obidos-medieval-villages",
        pricing: SEEDED.obidos,
        sortOrder: 1,
      }),
      row({
        id: "00000000-0000-0000-0000-000000000003",
        slug: "manzwine",
        kind: "complement",
        pricing: SEEDED.manzwine,
        sortOrder: 3,
      }),
    ];

    expect(sellableTours(await listExperiences())).toHaveLength(2);
  });

  it("still finds them when the database is unreachable", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    table.error = new Error("no DATABASE_URL");

    // The shipped fallback carries the real figures on purpose: an outage
    // costs the site its newest price list, not the ability to sell.
    expect(sellableTours(await listExperiences()).length).toBeGreaterThan(0);
  });

  it("still finds them when the table has not been seeded", async () => {
    table.rows = [];

    expect(sellableTours(await listExperiences()).length).toBeGreaterThan(0);
  });
});

describe("when the fallback is an outage rather than the design", () => {
  /**
   * The same fallback serves two opposite situations: a build or a test with
   * no database at all, which is the module's promise, and a deployment whose
   * database could not be reached, which is an hour of the site quietly
   * selling last deploy's price list. `DATABASE_URL` is what tells them apart.
   */
  const originalUrl = process.env.DATABASE_URL;

  beforeEach(() => {
    vi.mocked(captureError).mockClear();
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    if (originalUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = originalUrl;
  });

  it("raises the alarm when a configured database cannot be read", async () => {
    process.env.DATABASE_URL = "postgresql://neon.example/agorasim";
    const outage = new Error("connection refused");
    table.error = outage;

    await listCatalogue();

    expect(captureError).toHaveBeenCalledWith(
      outage,
      expect.objectContaining({
        area: "catalogue",
        tags: expect.objectContaining({ read: "list", fallback: "shipped-experiences" }),
      }),
    );
  });

  it("raises it for the single-slug read too, and says which", async () => {
    process.env.DATABASE_URL = "postgresql://neon.example/agorasim";
    table.error = new Error("connection refused");

    await getCatalogueEntry("rural-saloia");

    expect(captureError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        tags: expect.objectContaining({ read: "entry" }),
        extra: expect.objectContaining({ detail: expect.stringContaining("rural-saloia") }),
      }),
    );
  });

  it("stays quiet when there is no database to reach", async () => {
    delete process.env.DATABASE_URL;
    table.error = new Error("DATABASE_URL is not set");

    await listCatalogue();

    // A build without a database is what the fallback is for.
    expect(captureError).not.toHaveBeenCalled();
  });

  it("stays quiet when the table is merely unseeded", async () => {
    process.env.DATABASE_URL = "postgresql://neon.example/agorasim";
    table.rows = [];

    await listCatalogue();

    expect(captureError).not.toHaveBeenCalled();
  });
});

describe("a price list the code cannot read", () => {
  const malformed: [string, unknown][] = [
    ["a string where an object belongs", "62 euros"],
    ["a shape with no type", { public: { tiers: [], childCents: 3500 } }],
    ["a tour that sells neither publicly nor privately", { type: "tour" }],
    [
      "a mode with no tiers",
      { type: "tour", public: { tiers: [], childCents: 3500 } },
    ],
    [
      "a tier that prices nothing",
      { type: "tour", public: { tiers: [{ minAdults: 1, maxAdults: 3 }], childCents: 3500 } },
    ],
    [
      "money that is not money",
      {
        type: "tour",
        public: { tiers: [{ minAdults: 1, maxAdults: 3, perAdultCents: "62" }], childCents: 3500 },
      },
    ],
    [
      "a band that ends before it starts",
      {
        type: "tour",
        public: { tiers: [{ minAdults: 4, maxAdults: 2, perAdultCents: 6200 }], childCents: 3500 },
      },
    ],
    [
      "an add-on with no adult rate",
      { type: "addon", childCents: 2500, minGuests: 2 },
    ],
  ];

  it.each(malformed)("reads as unpriced: %s", async (_label, pricing) => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    table.rows = [row({ pricing: pricing as ExperienceRow["pricing"] })];

    const [entry] = await listCatalogue();

    // Unpriced, not thrown: the tour still renders and the enquiry form takes
    // the lead. A crash here would take the whole page down instead.
    expect(entry.pricing).toBeNull();
    expect(isPriced(entry.pricing)).toBe(false);
  });

  it("says so once, so a lost checkout is not silent", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    table.rows = [row({ slug: "warns-once", pricing: "nonsense" as unknown as ExperiencePricing })];

    await listCatalogue();
    await listCatalogue();

    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0]?.[0]).toContain("warns-once");
  });
});
