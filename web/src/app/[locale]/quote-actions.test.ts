import { afterEach, describe, expect, it, vi } from "vitest";

import { HONEYPOT_FIELD } from "@/lib/honeypot";

/*
 * The trap on the wedding and event quote forms (feedback round 2): a filled
 * trap is discarded and logged, and an empty one reaches the Sales board and
 * sends both emails. Everything behind the action is a stand-in.
 */
const { insert, values, sendLoggedEmail, rateLimit } = vi.hoisted(() => {
  const values = vi.fn((_row: unknown) => ({ returning: vi.fn(async () => [{ id: "req-1" }]) }));
  return {
    values,
    insert: vi.fn((_table: unknown) => ({ values })),
    sendLoggedEmail: vi.fn(async () => ({ status: "sent" })),
    rateLimit: vi.fn(async () => ({ allowed: true })),
  };
});

vi.mock("@/db", async () => {
  const schema = await vi.importActual<typeof import("@/db/schema")>("@/db/schema");
  return { ...schema, db: { insert } };
});
vi.mock("@/lib/rate-limit", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/rate-limit")>()),
  rateLimit,
}));
vi.mock("@/lib/request-ip", () => ({ clientIp: vi.fn(async () => "203.0.113.1") }));
vi.mock("@/lib/message-log", () => ({ sendLoggedEmail }));
vi.mock("@/lib/email", () => ({ teamRecipients: () => ["team@example.com"] }));
vi.mock("@/lib/site-origin", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/site-origin")>()),
  siteUrl: () => "https://uat.agorasim.pt",
}));
vi.mock("@/lib/booking-emails", () => ({
  guestEnquiryAckEmail: vi.fn(() => ({})),
  teamEnquiryEmail: vi.fn(() => ({})),
}));

import { submitQuoteRequest } from "./quote-actions";

/** A wedding enquiry a couple could really have sent. */
function weddingForm(trap = ""): FormData {
  const form = new FormData();
  form.set("locale", "en");
  form.set("kind", "wedding");
  form.set("name", "Ana & Rui");
  form.set("email", "ana@example.com");
  form.set(HONEYPOT_FIELD, trap);
  return form;
}

describe("submitQuoteRequest — the honeypot", () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it("discards a submission that filled the trap, and logs it", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const state = await submitQuoteRequest({}, weddingForm("http://spam.example"));

    expect(state).toEqual({ ok: true });
    expect(insert).not.toHaveBeenCalled();
    expect(sendLoggedEmail).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("discarded honeypot submission"));
  });

  it("stores an enquiry with an empty trap and sends both emails", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const state = await submitQuoteRequest({}, weddingForm());

    expect(state).toEqual({ ok: true });
    expect(insert).toHaveBeenCalledTimes(1);
    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "wedding", name: "Ana & Rui", source: "website" }),
    );
    expect(sendLoggedEmail).toHaveBeenCalledTimes(2);
    expect(warn).not.toHaveBeenCalled();
  });
});

/*
 * A refused enquiry sends back what the guest typed (JAM-487). React resets
 * the form after the action, and the form uses these values as its defaults,
 * so the guest corrects one field and keeps the rest.
 */
describe("submitQuoteRequest — a refused field keeps the guest's values", () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  /** An event enquiry with every field filled, and a name and email to vary. */
  function eventForm(name: string, email: string, locale = "pt"): FormData {
    const form = new FormData();
    form.set("locale", locale);
    form.set("kind", "event");
    form.set(HONEYPOT_FIELD, "");
    form.set("name", name);
    form.set("email", email);
    form.set("phone", "+351 912 345 678");
    form.set("preferredDate", "12/06/2027");
    form.set("venue", "Quinta da Regaleira");
    form.set("serviceHours", "4h");
    form.set("preferredCar", "car-x");
    form.set("partySize", "40");
    form.set("message", "Três carros, por favor.");
    form.set("marketingConsent", "on");
    return form;
  }

  const typed = {
    phone: "+351 912 345 678",
    preferredDate: "12/06/2027",
    venue: "Quinta da Regaleira",
    ceremonyTime: "",
    serviceHours: "4h",
    preferredCar: "car-x",
    partySize: "40",
    message: "Três carros, por favor.",
    marketingConsent: true,
  };

  it.each(["pt", "en"])("returns every field with an invalid email (%s)", async (locale) => {
    const state = await submitQuoteRequest({}, eventForm("Ana Lopes", "ana@", locale));

    expect(state.fieldErrors?.email).toBeTruthy();
    expect(state.fieldErrors?.name).toBeUndefined();
    expect(state.values).toEqual({ name: "Ana Lopes", email: "ana@", ...typed });
    expect(insert).not.toHaveBeenCalled();
    expect(sendLoggedEmail).not.toHaveBeenCalled();
  });

  it.each(["pt", "en"])("returns every field with an empty name (%s)", async (locale) => {
    const state = await submitQuoteRequest({}, eventForm("  ", "ana@example.com", locale));

    expect(state.fieldErrors?.name).toBeTruthy();
    expect(state.fieldErrors?.email).toBeUndefined();
    expect(state.values).toEqual({ name: "  ", email: "ana@example.com", ...typed });
    expect(insert).not.toHaveBeenCalled();
  });

  it("does not send back the honeypot or the hidden fields", async () => {
    const state = await submitQuoteRequest({}, eventForm("Ana Lopes", "ana@"));

    expect(state.values).not.toHaveProperty(HONEYPOT_FIELD);
    expect(state.values).not.toHaveProperty("locale");
    expect(state.values).not.toHaveProperty("kind");
  });

  it("sends back no values when the enquiry is stored", async () => {
    const state = await submitQuoteRequest({}, eventForm("Ana Lopes", "ana@example.com"));

    expect(state).toEqual({ ok: true });
    expect(insert).toHaveBeenCalledTimes(1);
  });
});
