import { afterEach, describe, expect, it, vi } from "vitest";

import { bookingContent } from "@/content/booking";

/*
 * The checkout action's own refusal when Stripe is off. The page never renders
 * the checkout form in that state, so this is the belt to its braces: a
 * deployment that loses its key between render and submit, or a crafted POST,
 * gets the payments-off message back — never a thrown error, never a session.
 */
// Hoisted with the mocks, so the factory below never runs ahead of it.
const { rateLimit } = vi.hoisted(() => ({ rateLimit: vi.fn() }));
vi.mock("@/lib/rate-limit", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/rate-limit")>()),
  rateLimit,
}));
vi.mock("@/lib/request-ip", () => ({ clientIp: vi.fn(async () => "203.0.113.1") }));
vi.mock("next/headers", () => ({ headers: vi.fn(async () => new Headers()) }));

// Stand-ins for everything behind the action's own checks: the catalogue, the
// price, the calendar re-check and the session itself.
const { startBookingCheckout, releaseBookingCheckout } = vi.hoisted(() => ({
  startBookingCheckout: vi.fn(),
  releaseBookingCheckout: vi.fn(),
}));
vi.mock("@/lib/booking-checkout", () => ({ startBookingCheckout, releaseBookingCheckout }));
vi.mock("@/lib/experience-catalogue", () => ({
  listExperiences: vi.fn(async () => [
    { slug: "rural-saloia", kind: "signature", pricing: { type: "tour" } },
  ]),
}));
vi.mock("@/lib/pricing", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/pricing")>()),
  priceBooking: vi.fn(() => ({ ok: true, lines: [], totalCents: 19_000, seats: 2 })),
}));
vi.mock("@/lib/bookings", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/bookings")>()),
  slotOccupancyOn: vi.fn(async () => ({})),
}));
vi.mock("@/lib/availability", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/availability")>()),
  checkSlotAvailable: vi.fn(() => ({ ok: true, vehicleClass: "classic-small" })),
}));

async function load() {
  vi.resetModules();
  return import("./checkout-actions");
}

describe("startCheckout with no STRIPE_SECRET_KEY", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("refuses with the payments-off message, in the form's locale, and echoes what was typed", async () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "");
    vi.stubEnv("VERCEL_ENV", "production");
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { startCheckout } = await load();

    const form = new FormData();
    form.set("locale", "en");
    form.set("name", "  Ana  ");
    form.set("email", "ana@example.com");

    const state = await startCheckout({}, form);

    expect(state.error).toBe(bookingContent.errors.paymentsOff.en);
    expect(state.values).toMatchObject({ name: "Ana", email: "ana@example.com" });
    // Refused before any defence or Stripe call ran.
    expect(rateLimit).not.toHaveBeenCalled();
  });

  it("refuses the same way when the key contradicts the deployment", async () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_live_123");
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { startCheckout } = await load();

    const form = new FormData();
    form.set("locale", "pt");
    const state = await startCheckout({}, form);

    expect(state.error).toBe(bookingContent.errors.paymentsOff.pt);
    expect(rateLimit).not.toHaveBeenCalled();
  });
});

/** A booking form a guest could really have submitted. */
function validForm(): FormData {
  const form = new FormData();
  form.set("locale", "en");
  form.set("name", "Ana");
  form.set("email", "ana@example.com");
  form.set("date", "2026-11-14");
  form.set("slot", "morning");
  form.set("experience", "rural-saloia");
  form.set("mode", "public");
  form.set("adults", "2");
  return form;
}

describe("startCheckout — paying on the booking page", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    startBookingCheckout.mockReset();
  });

  function payable() {
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_123");
    vi.stubEnv("STRIPE_PUBLISHABLE_KEY", "pk_test_123");
    rateLimit.mockResolvedValue({ allowed: true });
  }

  it("hands back the session's client secret instead of sending the guest to Stripe", async () => {
    payable();
    vi.stubEnv("STRIPE_CONNECTED_ACCOUNT_ID", "");
    startBookingCheckout.mockResolvedValue({
      clientSecret: "cs_test_1_secret_2",
      bookingId: "booking-1",
    });
    const { startCheckout } = await load();

    // A redirect would throw here (that is how `redirect()` signals); this
    // resolves, with what the browser needs to mount Stripe's form.
    const state = await startCheckout({}, validForm());

    expect(state).toEqual({
      payment: {
        clientSecret: "cs_test_1_secret_2",
        publishableKey: "pk_test_123",
        stripeAccount: null,
      },
    });
  });

  it("names the connected account Stripe.js must look for a direct charge on", async () => {
    payable();
    vi.stubEnv("STRIPE_CONNECTED_ACCOUNT_ID", "acct_test_agorasim");
    startBookingCheckout.mockResolvedValue({ clientSecret: "cs_test_1_secret_2", bookingId: "b" });
    const { startCheckout } = await load();

    const state = await startCheckout({}, validForm());

    expect(state.payment?.stripeAccount).toBe("acct_test_agorasim");
  });

  it("refuses with the payments-off message when the browser key is missing", async () => {
    payable();
    vi.stubEnv("STRIPE_PUBLISHABLE_KEY", "");
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { startCheckout } = await load();

    const state = await startCheckout({}, validForm());

    expect(state.error).toBe(bookingContent.errors.paymentsOff.en);
    expect(state.payment).toBeUndefined();
    expect(startBookingCheckout).not.toHaveBeenCalled();
  });
});

describe("releaseCheckout — back from the payment step", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    releaseBookingCheckout.mockReset();
  });

  it("releases the guest's own checkout, by its client secret", async () => {
    rateLimit.mockResolvedValue({ allowed: true });
    releaseBookingCheckout.mockResolvedValue("released");
    const { releaseCheckout } = await load();

    await releaseCheckout("cs_test_1_secret_2");

    expect(releaseBookingCheckout).toHaveBeenCalledWith("cs_test_1_secret_2");
  });

  it("swallows a failure — the guest is back on their form either way", async () => {
    rateLimit.mockResolvedValue({ allowed: true });
    releaseBookingCheckout.mockRejectedValue(new Error("Stripe is down"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { releaseCheckout } = await load();

    await expect(releaseCheckout("cs_test_1_secret_2")).resolves.toBeUndefined();
  });

  it("does nothing once the throttle says no", async () => {
    rateLimit.mockResolvedValue({ allowed: false });
    const { releaseCheckout } = await load();

    await releaseCheckout("cs_test_1_secret_2");

    expect(releaseBookingCheckout).not.toHaveBeenCalled();
  });
});
