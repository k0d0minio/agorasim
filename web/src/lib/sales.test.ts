import { describe, expect, it } from "vitest";

import {
  enquiryRef,
  exampleBookingRecords,
  groupByStage,
  readSourceFilter,
  readStatusFilter,
  readView,
  recordFromRequest,
  salesHref,
  type SalesRecord,
} from "@/lib/sales";
import { REQUEST_STATUSES } from "@/lib/admin-format";
import type { TourRequest } from "@/db";

/**
 * The Sales screen's pure half: how a URL encodes which view and which filter,
 * how a database row becomes a card, and how cards land in columns.
 *
 * The reads themselves aren't here — they are one `db.batch` covered by types
 * and by the build. What is here is everything a wrong answer would show an
 * operator without erroring: a filter chip that drops the view, a board that
 * files a lead under the wrong stage, a paginated link that keeps page 3 after
 * the filter changed.
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
  it("carries the fields both views render", () => {
    const record = recordFromRequest(tourRequest());

    expect(record).toMatchObject({
      source: "enquiry",
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

  it("has no money on it — quoting is not built yet", () => {
    const record = recordFromRequest(tourRequest());
    expect(record.value).toBeNull();
    expect(record.payment).toBeNull();
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

describe("salesHref", () => {
  const current = {
    view: "board" as const,
    filters: { source: "all" as const, status: null },
  };

  it("omits every default, so the plain screen is a plain URL", () => {
    expect(salesHref(current)).toBe("/admin/sales");
  });

  it("keeps the facets it wasn't asked to change", () => {
    const filtered = {
      view: "table" as const,
      filters: { source: "enquiry" as const, status: "new" as const },
    };
    expect(salesHref(filtered, { status: "quoted" })).toBe(
      "/admin/sales?view=table&source=enquiry&status=quoted",
    );
  });

  it("clears an explicit status back to every stage", () => {
    const filtered = {
      view: "board" as const,
      filters: { source: "all" as const, status: "booked" as const },
    };
    expect(salesHref(filtered, { status: null })).toBe("/admin/sales");
  });

  it("drops the page number when a facet changes", () => {
    const deep = {
      view: "table" as const,
      filters: { source: "all" as const, status: null },
      page: 3,
    };
    // Page 3 of a filter that now matches four rows is an empty screen.
    expect(salesHref(deep, { source: "booking" })).toBe(
      "/admin/sales?view=table&source=booking",
    );
  });

  it("keeps the page number when only paginating", () => {
    const deep = {
      view: "table" as const,
      filters: { source: "all" as const, status: null },
      page: 1,
    };
    expect(salesHref(deep, { page: 2 })).toBe("/admin/sales?view=table&page=2");
  });
});

describe("reading the query string", () => {
  it("defaults to the board — triage is the daily job", () => {
    expect(readView(undefined)).toBe("board");
    expect(readView("nonsense")).toBe("board");
    expect(readView("table")).toBe("table");
  });

  it("defaults to showing everything", () => {
    expect(readSourceFilter(undefined)).toBe("all");
    expect(readSourceFilter("bookings")).toBe("all");
    expect(readSourceFilter("booking")).toBe("booking");
  });

  it("treats an unknown stage as no stage filter", () => {
    expect(readStatusFilter(undefined)).toBeNull();
    expect(readStatusFilter("in_progress")).toBeNull();
    expect(readStatusFilter("quoted")).toBe("quoted");
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
