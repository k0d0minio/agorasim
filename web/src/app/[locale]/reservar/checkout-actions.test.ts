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
