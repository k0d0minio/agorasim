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
vi.mock("@/lib/site-origin", () => ({ siteUrl: () => "https://uat.agorasim.pt" }));
vi.mock("@/lib/booking-emails", () => ({
  guestEnquiryAckEmail: vi.fn(() => ({})),
  teamEnquiryEmail: vi.fn(() => ({})),
}));
vi.mock("@/lib/experience-catalogue", () => ({
  listExperiences: vi.fn(async () => [{ slug: "rural-saloia" }]),
}));
vi.mock("@/lib/bookings", () => ({ countSlotOccupancy: vi.fn(async () => ({})) }));
vi.mock("@/lib/availability", () => ({
  isDateKey: () => false,
  checkDayBookable: vi.fn(async () => true),
}));

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
