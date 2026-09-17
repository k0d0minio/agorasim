import { describe, expect, it } from "vitest";

import {
  enquiryRef,
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
 * without erroring: a board that files a lead under the wrong stage, or a card
 * carrying money no booking backs.
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
    venue: null,
    serviceHours: null,
    preferredCar: null,
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
      ref: "BK-ABD1AE",
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

  it("carries the reference the guest was given, which is not the lead's", () => {
    const lead = tourRequest();
    const record = recordFromRequest(lead, {
      ref: "BK-ABD1AE",
      value: "€340",
      payment: "Paid in full",
      date: "2026-08-22",
    });

    // The guest quotes the booking's reference; the team has always used the
    // lead's. They are derived from different uuids, so a card that carried
    // only one of them could not be found by somebody reading the other off a
    // confirmation email.
    expect(record.bookingRef).toBe("BK-ABD1AE");
    expect(record.ref).toBe(enquiryRef(lead.id));
    expect(record.ref).not.toBe(record.bookingRef);
  });

  it("has no guest reference when nothing was ever sold", () => {
    expect(recordFromRequest(tourRequest()).bookingRef).toBeNull();
  });

  it("carries the venue a wedding names, and none for a tour", () => {
    expect(recordFromRequest(tourRequest()).venue).toBe(null);
    expect(
      recordFromRequest(
        tourRequest({
          kind: "wedding",
          venue: "Igreja de São Pedro, Mafra",
          preferredDate: "2027-06-12",
        }),
      ),
    ).toMatchObject({
      kind: "wedding",
      venue: "Igreja de São Pedro, Mafra",
      // The two facts the card is triaged on, together.
      when: "2027-06-12",
    });
  });

  it("lets a booked day beat the event date, as it does any other", () => {
    const record = recordFromRequest(
      tourRequest({ kind: "event", venue: "Quinta da Beloura", preferredDate: "2027-06-12" }),
      {
        ref: "BK-ABD1AE",
        value: "€340",
        payment: "Paid in full",
        date: "2027-06-13",
      },
    );
    expect(record.when).toBe("2027-06-13");
    expect(record.venue).toBe("Quinta da Beloura");
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
      recordFromRequest(tourRequest({ id: "bbbbbbbb-cccc-dddd-eeee-ffffffffffff", status: "booked" })),
    ];

    const byStatus = Object.fromEntries(
      groupByStage(records).map((column) => [column.status, column.records.length]),
    );

    expect(byStatus.new).toBe(1);
    expect(byStatus.quoted).toBe(1);
    expect(byStatus.booked).toBe(1);
    expect(byStatus.contacted).toBe(0);
  });
});
