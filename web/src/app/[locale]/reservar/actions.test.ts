import { afterEach, describe, expect, it, vi } from "vitest";

import { HONEYPOT_FIELD } from "@/lib/honeypot";

/*
 * The trap on the tour enquiry form (feedback round 2): a filled trap is
 * discarded and logged, and an empty one reaches the Sales board and sends
 * both emails. Everything behind the action is a stand-in.
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
vi.mock("@/lib/experience-catalogue", () => ({
  listExperiences: vi.fn(async () => [{ slug: "rural-saloia" }]),
}));
vi.mock("@/lib/bookings", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/bookings")>()),
  countSlotOccupancy: vi.fn(async () => ({})),
}));
vi.mock("@/lib/availability", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/availability")>()),
  checkDayBookable: vi.fn(async () => true),
}));

import { checkDayBookable } from "@/lib/availability";
import { submitTourRequest } from "./actions";

/** A tour enquiry a guest could really have sent. */
function tourForm(trap = ""): FormData {
  const form = new FormData();
  form.set("locale", "pt");
  form.set("name", "Ana");
  form.set("email", "ana@example.com");
  form.set("experience", "rural-saloia");
  form.set(HONEYPOT_FIELD, trap);
  return form;
}

describe("submitTourRequest — the honeypot", () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it("discards a submission that filled the trap, and logs it", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const state = await submitTourRequest({}, tourForm("http://spam.example"));

    expect(state).toEqual({ ok: true });
    expect(insert).not.toHaveBeenCalled();
    expect(sendLoggedEmail).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("discarded honeypot submission"));
  });

  it("stores an enquiry with an empty trap and sends both emails", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const state = await submitTourRequest({}, tourForm());

    expect(state).toEqual({ ok: true });
    expect(insert).toHaveBeenCalledTimes(1);
    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Ana", experienceSlug: "rural-saloia", source: "website" }),
    );
    expect(sendLoggedEmail).toHaveBeenCalledTimes(2);
    expect(warn).not.toHaveBeenCalled();
  });
});

describe("submitTourRequest — where the visit started (JAM-506)", () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it("stores the utm_source and only the host of the referrer", async () => {
    const form = tourForm();
    form.set("landingUtmSource", "chatgpt.com");
    form.set("landingReferrer", "https://chatgpt.com/c/a-private-conversation");

    expect(await submitTourRequest({}, form)).toEqual({ ok: true });
    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({
        landingUtmSource: "chatgpt.com",
        landingReferrerHost: "chatgpt.com",
      }),
    );
  });

  it("ignores the site's own page as a referrer", async () => {
    const form = tourForm();
    form.set("landingUtmSource", "");
    form.set("landingReferrer", "https://uat.agorasim.pt/pt/experiencias");

    await submitTourRequest({}, form);

    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({ landingUtmSource: null, landingReferrerHost: "" }),
    );
  });

  it("drops a value that is not valid, and stores the enquiry", async () => {
    const form = tourForm();
    form.set("landingUtmSource", "<script>alert(1)</script>");
    form.set("landingReferrer", "javascript:alert(1)");

    expect(await submitTourRequest({}, form)).toEqual({ ok: true });
    expect(insert).toHaveBeenCalledTimes(1);
    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({ landingUtmSource: null, landingReferrerHost: "" }),
    );
  });

  it("says not recorded for a form that carries no source fields", async () => {
    await submitTourRequest({}, tourForm());

    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({ landingUtmSource: null, landingReferrerHost: null }),
    );
  });
});

/*
 * A refused enquiry sends back what the guest typed (JAM-497). React resets
 * the form after the action, and the form uses these values as its defaults,
 * so the guest corrects one field and keeps the rest.
 */
describe("submitTourRequest — a refused field keeps the guest's values", () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  /** A tour enquiry with every field filled, and a name, email and date to vary. */
  function fullForm(
    name: string,
    email: string,
    { locale = "pt", preferredDate = "fim de agosto" } = {},
  ): FormData {
    const form = new FormData();
    form.set("locale", locale);
    form.set(HONEYPOT_FIELD, "");
    form.set("name", name);
    form.set("email", email);
    form.set("phone", "+351 912 345 678");
    form.set("partySize", "4");
    form.set("experience", "rural-saloia");
    form.set("preferredDate", preferredDate);
    form.append("addOns", "picnic");
    form.append("addOns", "wine-tasting");
    form.set("message", "Dois adultos e duas crianças.");
    form.set("marketingConsent", "on");
    return form;
  }

  const typed = {
    phone: "+351 912 345 678",
    partySize: "4",
    experience: "rural-saloia",
    preferredDate: "fim de agosto",
    addOns: ["picnic", "wine-tasting"],
    message: "Dois adultos e duas crianças.",
    taxId: "",
    marketingConsent: true,
  };

  it.each(["pt", "en"])("refuses a NIF with a wrong check digit and keeps every field (%s)", async (locale) => {
    const form = fullForm("Ana Lopes", "ana@example.com", { locale });
    form.set("taxId", "123456780");
    const state = await submitTourRequest({}, form);

    expect(state.fieldErrors?.taxId).toBeTruthy();
    expect(state.values).toEqual({
      name: "Ana Lopes",
      email: "ana@example.com",
      ...typed,
      taxId: "123456780",
    });
    expect(insert).not.toHaveBeenCalled();
  });

  it.each(["pt", "en"])("returns every field with an invalid email (%s)", async (locale) => {
    const state = await submitTourRequest({}, fullForm("Ana Lopes", "ana@", { locale }));

    expect(state.fieldErrors?.email).toBeTruthy();
    expect(state.fieldErrors?.name).toBeUndefined();
    expect(state.values).toEqual({ name: "Ana Lopes", email: "ana@", ...typed });
    expect(insert).not.toHaveBeenCalled();
    expect(sendLoggedEmail).not.toHaveBeenCalled();
  });

  it.each(["pt", "en"])("returns every field with an empty name (%s)", async (locale) => {
    const state = await submitTourRequest({}, fullForm("  ", "ana@example.com", { locale }));

    expect(state.fieldErrors?.name).toBeTruthy();
    expect(state.fieldErrors?.email).toBeUndefined();
    expect(state.values).toEqual({ name: "  ", email: "ana@example.com", ...typed });
    expect(insert).not.toHaveBeenCalled();
  });

  it("returns every field when the chosen day is no longer open", async () => {
    vi.mocked(checkDayBookable).mockResolvedValueOnce(false);
    const state = await submitTourRequest(
      {},
      fullForm("Ana Lopes", "ana@example.com", { preferredDate: "2027-06-12" }),
    );

    expect(state.fieldErrors?.preferredDate).toBeTruthy();
    expect(state.values).toEqual({
      name: "Ana Lopes",
      email: "ana@example.com",
      ...typed,
      preferredDate: "2027-06-12",
    });
    expect(insert).not.toHaveBeenCalled();
  });

  it("returns one add-on as a list, and no date when the date is empty", async () => {
    const form = fullForm("Ana Lopes", "ana@", { preferredDate: "  " });
    form.delete("addOns");
    form.set("addOns", "picnic");
    const state = await submitTourRequest({}, form);

    expect(state.values?.addOns).toEqual(["picnic"]);
    expect(state.values?.preferredDate).toBeUndefined();
  });

  it("does not send back the honeypot or the hidden fields", async () => {
    const state = await submitTourRequest({}, fullForm("Ana Lopes", "ana@"));

    expect(state.values).not.toHaveProperty(HONEYPOT_FIELD);
    expect(state.values).not.toHaveProperty("locale");
  });

  it("sends back no values when the enquiry is stored", async () => {
    const state = await submitTourRequest({}, fullForm("Ana Lopes", "ana@example.com"));

    expect(state).toEqual({ ok: true });
    expect(insert).toHaveBeenCalledTimes(1);
  });
});
