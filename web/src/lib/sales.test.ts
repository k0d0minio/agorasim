import { describe, expect, it } from "vitest";

import {
  enquiryRef,
  exampleBookingRecords,
  groupByStage,
  recordFromRequest,
  type SalesRecord,
} from "@/lib/sales";
import { REQUEST_STATUSES } from "@/lib/admin-format";
import type { TourRequest } from "@/db";

/**
 * The Sales screen's pure half: how a database row becomes a card, and how
 * cards land in columns.
 *
 * The read itself isn't here — it is one `db.batch` covered by types and by
 * the build. What is here is everything a wrong answer would show an operator
 * without erroring: a board that files a lead under the wrong stage, an
 * example booking passing itself off as real money.
 */

function tourRequest(overrides: Partial<TourRequest> = {}): TourRequest {
  return {
    id: "11111111-2222-3333-4444-555555555555",
    name: "Sofia Almeida",
    email: "sofia@example.com",
    phone: "+351912345678",
    locale: "pt",
    kind: "tour",
    experienceSlug: "rural-saloia",
    addOns: ["manzwine"],
    partySize: 2,
    preferredDate: "15 August",
    message: "Somos dois.",
    status: "new",
    source: "website",
    internalNotes: null,
    lastContactedAt: null,
    marketingConsent: false,
    marketingConsentAt: null,
    marketingConsentVersion: null,
    anonymisedAt: null,
    createdAt: new Date("2026-08-01T10:00:00Z"),
    updatedAt: new Date("2026-08-01T10:00:00Z"),
    ...overrides,
  };
}

describe("enquiryRef", () => {
  it("is short, stable and derived from the id", () => {
    const id = "11111111-2222-3333-4444-555555555555";
    expect(enquiryRef(id)).toBe("EN-111111");
    expect(enquiryRef(id)).toBe(enquiryRef(id));
  });
});

describe("recordFromRequest", () => {
  it("carries the fields the board renders", () => {
    const record = recordFromRequest(tourRequest());

    expect(record).toMatchObject({
      kind: "tour",
      status: "new",
      experienceSlug: "rural-saloia",
      addOns: ["manzwine"],
      partySize: 2,
      // The guest's own words for "when", not a parsed date — the form takes
      // free text on purpose.
      when: "15 August",
      example: false,
    });
  });

  it("links to the lead's own page", () => {
    const lead = tourRequest();
    expect(recordFromRequest(lead).href).toBe(`/admin/sales/${lead.id}`);
  });

  it("has no money on it when nothing has been booked", () => {
    const record = recordFromRequest(tourRequest());
    expect(record.value).toBeNull();
    expect(record.payment).toBeNull();
  });

  it("carries the money, and the booked day, when a booking is behind it", () => {
    const record = recordFromRequest(tourRequest(), {
      value: "€340",
      payment: "Paid in full",
      date: "2026-08-22",
    });

    expect(record.value).toBe("€340");
    expect(record.payment).toBe("Paid in full");
    // The day that was actually sold wins over the guest's free-text guess:
    // "15 August" was a hope, the 22nd is a booking.
    expect(record.when).toBe("2026-08-22");
  });
});

describe("exampleBookingRecords", () => {
  it("marks every row as an example", () => {
    const records = exampleBookingRecords();
    expect(records.length).toBeGreaterThan(0);
    expect(records.every((record) => record.example)).toBe(true);
  });

  it("files them as booked, and gives them no detail page to open", () => {
    for (const record of exampleBookingRecords()) {
      expect(record.status).toBe("booked");
      expect(record.href).toBeNull();
    }
  });

  it("references the catalogue by slug, so the same icons draw for them", () => {
    const [first] = exampleBookingRecords();
    expect(first.experienceSlug).toMatch(/^[a-z0-9-]+$/);
  });
});

describe("groupByStage", () => {
  it("returns every column, in lifecycle order, empty ones included", () => {
    expect(groupByStage([]).map((column) => column.status)).toEqual(REQUEST_STATUSES);
  });

  it("files each record under its own stage", () => {
    const records: SalesRecord[] = [
      recordFromRequest(tourRequest({ status: "new" })),
      recordFromRequest(tourRequest({ id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee", status: "quoted" })),
      ...exampleBookingRecords(),
    ];

    const byStatus = Object.fromEntries(
      groupByStage(records).map((column) => [column.status, column.records.length]),
    );

    expect(byStatus.new).toBe(1);
    expect(byStatus.quoted).toBe(1);
    expect(byStatus.booked).toBe(exampleBookingRecords().length);
    expect(byStatus.contacted).toBe(0);
  });
});
