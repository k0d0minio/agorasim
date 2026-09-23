import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactElement, ReactNode } from "react";

import { bookingContent } from "@/content/booking";
import { experiences } from "@/content/experiences";
import { tourRequestContent } from "@/content/tour-request";

/*
 * The launch plan's contingency — Diogo & Rita's Stripe account not verified
 * on the night — is to go live with no `STRIPE_SECRET_KEY` and take bookings
 * by hand from the enquiry form. This is the one path the sandbox never
 * exercised, so it is pinned here: the page's own decision (`canCheckout`),
 * the metadata that describes it, and the form it renders.
 *
 * The catalogue and the calendar are stubbed at their module boundary: a
 * priced signature tour and a month with an opening, so that the only thing
 * deciding the branch is the Stripe key. Async Server Components cannot be
 * rendered here (no DOM, no React server runtime), but the element tree the
 * page returns can be walked — which is enough to say which form is in it.
 */
vi.mock("@/lib/experience-catalogue", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/experience-catalogue")>()),
  listExperiences: vi.fn(async () => experiences),
}));

vi.mock("@/lib/bookings", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/bookings")>()),
  countSlotOccupancy: vi.fn(async () => new Map()),
}));

vi.mock("@/lib/availability", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/availability")>();
  return {
    ...actual,
    readPublicCalendar: vi.fn(async () => [
      { month: "2026-10", label: "October 2026", grid: [], days: [], hasOpenings: true },
    ]),
  };
});

/** The component names present anywhere in a returned element tree. */
function componentNames(node: ReactNode, into = new Set<string>()): Set<string> {
  if (Array.isArray(node)) {
    for (const child of node) componentNames(child, into);
    return into;
  }
  if (!node || typeof node !== "object" || !("type" in node)) return into;
  const element = node as ReactElement<{ children?: ReactNode }>;
  const type = element.type;
  if (typeof type === "function") into.add(type.name);
  componentNames(element.props?.children, into);
  return into;
}

async function load() {
  vi.resetModules();
  return import("./page");
}

describe("/reservar with no STRIPE_SECRET_KEY — the launch fallback", () => {
  beforeEach(() => {
    vi.stubEnv("STRIPE_SECRET_KEY", "");
    vi.stubEnv("VERCEL_ENV", "production");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("describes an enquiry, not a checkout, in its metadata", async () => {
    const { generateMetadata } = await load();
    for (const locale of ["pt", "en"] as const) {
      const metadata = await generateMetadata({ params: Promise.resolve({ locale }) });
      expect(metadata.title).toBe(tourRequestContent.title[locale]);
      expect(metadata.description).toBe(tourRequestContent.lead[locale]);
    }
  });

  it("renders the enquiry form, and never the checkout", async () => {
    const { default: BookingPage } = await load();
    const tree = await BookingPage({ params: Promise.resolve({ locale: "en" }) });
    const names = componentNames(tree);
    expect(names.has("TourRequestForm")).toBe(true);
    expect(names.has("BookingCheckoutForm")).toBe(false);
  });

  it("says payment is off, in the words checkout uses for it", async () => {
    const { default: BookingPage } = await load();
    const tree = await BookingPage({ params: Promise.resolve({ locale: "pt" }) });
    expect(JSON.stringify(tree)).toContain(bookingContent.errors.paymentsOff.pt);
  });
});

describe("/reservar with a key that fits the deployment — the checkout", () => {
  beforeEach(() => {
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_123");
    vi.stubEnv("VERCEL_ENV", "preview");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  // Proves the stubs above would let the page sell: the key alone flips it.
  it("describes the checkout and renders it", async () => {
    const { default: BookingPage, generateMetadata } = await load();
    const metadata = await generateMetadata({ params: Promise.resolve({ locale: "en" }) });
    expect(metadata.title).toBe(bookingContent.title.en);

    const tree = await BookingPage({ params: Promise.resolve({ locale: "en" }) });
    const names = componentNames(tree);
    expect(names.has("BookingCheckoutForm")).toBe(true);
    expect(names.has("TourRequestForm")).toBe(false);
  });
});

describe("/reservar with a key that contradicts the deployment", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  // The env guard's user-facing half: a mismatch is the payments-off page,
  // never a half-sale on the wrong account.
  it("falls back to the enquiry form", async () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_123");
    vi.stubEnv("VERCEL_ENV", "production");
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { default: BookingPage } = await load();
    const tree = await BookingPage({ params: Promise.resolve({ locale: "en" }) });
    expect(componentNames(tree).has("TourRequestForm")).toBe(true);
    vi.restoreAllMocks();
  });
});
