import { describe, expect, it } from "vitest";

import {
  cardBooking,
  enquiryRef,
  groupByStage,
  leadDayLabel,
  paymentStateOf,
  recordFromRequest,
  tallySharedCars,
  type SalesRecord,
} from "@/lib/sales";
import { REQUEST_STATUSES } from "@/lib/admin-format";
import type { Booking, TourRequest } from "@/db";

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
    taxId: null,
    locale: "pt",
    kind: "tour",
    experienceSlug: "rural-saloia",
    addOns: ["manzwine"],
    partySize: 2,
    preferredDate: "15 August",
    message: "Somos dois.",
    venue: null,
    serviceHours: null,
    ceremonyTime: null,
    preferredCar: null,
    status: "new",
    source: "website",
    landingUtmSource: null,
    landingReferrerHost: null,
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
    expect(record.when).toContain("22 de agosto de 2026");
  });

  it("says a wedding or event date in words, as the rest of the admin does", () => {
    const record = recordFromRequest(
      tourRequest({ kind: "wedding", preferredDate: "2027-06-12" }),
    );
    expect(record.when).toContain("12 de junho de 2027");
    expect(record.when).not.toContain("2027-06-12");
    expect(leadDayLabel("2027-06-12")).toContain("12 de junho de 2027");
  });

  it("keeps a free-text date as the guest wrote it, and has nothing when there is no date", () => {
    expect(recordFromRequest(tourRequest()).when).toBe("15 August");
    expect(recordFromRequest(tourRequest({ preferredDate: null })).when).toBeNull();
    expect(leadDayLabel(null)).toBeNull();
    expect(leadDayLabel("")).toBeNull();
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
      when: "sábado, 12 de junho de 2027",
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
    expect(record.when).toContain("13 de junho de 2027");
    expect(record.venue).toBe("Quinta da Beloura");
  });
});

describe("the source of a record (JAM-506)", () => {
  it("shows the utm_source, the referrer, a direct visit and a row with no record", () => {
    const source = (landingUtmSource: string | null, landingReferrerHost: string | null) =>
      recordFromRequest(tourRequest({ landingUtmSource, landingReferrerHost })).source;

    expect(source("chatgpt.com", "chatgpt.com")).toBe("chatgpt.com");
    expect(source(null, "www.google.com")).toBe("google");
    expect(source(null, "")).toBe("Direta ou desconhecida");
    // A row from before the change, or one the team made in the console.
    expect(source(null, null)).toBe("Sem registo");
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

describe("only a paid booking takes a seat (JAM-291)", () => {
  const now = new Date("2026-08-15T10:00:00Z");
  const live = new Date("2026-08-15T10:05:00Z");
  const lapsed = new Date("2026-08-15T09:55:00Z");

  it("tells a paid booking, a checkout open now and a payment link apart", () => {
    expect(paymentStateOf({ status: "confirmed", holdExpiresAt: lapsed }, now)).toBe(
      "Paid in full",
    );
    expect(paymentStateOf({ status: "pending", holdExpiresAt: live }, now)).toBe(
      "In checkout",
    );
    // The board keeps a lapsed pending row only when a payment link waits on it.
    expect(paymentStateOf({ status: "pending", holdExpiresAt: lapsed }, now)).toBe(
      "Awaiting payment",
    );
  });

  it("counts only the paid parties of an open car as its booked seats", () => {
    const cars = tallySharedCars([
      { sharedCarId: "car-1", vehicleClass: "classic-small", partySize: 2, status: "confirmed" },
      { sharedCarId: "car-1", vehicleClass: "classic-small", partySize: 1, status: "pending" },
      { sharedCarId: "car-1", vehicleClass: "classic-small", partySize: 2, status: "expired" },
      { sharedCarId: "car-2", vehicleClass: "classic-small", partySize: 2, status: "pending" },
    ]);
    expect(cars.get("car-1")).toEqual({ seatsTaken: 2, seats: 3, parties: 1 });
    // A car with only a checkout in it has no booked seat at all.
    expect(cars.has("car-2")).toBe(false);
  });
});

describe("an unpaid checkout can be reminded (JAM-292)", () => {
  const now = new Date("2026-11-12T14:00:00Z");
  const lapsed = new Date("2026-11-12T13:00:00Z");
  const live = new Date("2026-11-12T14:10:00Z");

  function booking(overrides: Partial<Booking> = {}): Booking {
    return {
      id: "aaaaaaaa-1111-4111-8111-111111111111",
      status: "expired",
      date: "2026-11-28",
      holdExpiresAt: lapsed,
      paymentLinkTokenHash: null,
      ...overrides,
    } as Booking;
  }

  it("shows the lead's newest booking as unpaid, with the reminder on offer", () => {
    const row = booking();
    expect(cardBooking([row], new Map(), now)).toEqual({
      row,
      payment: "Unpaid",
      canRemind: true,
      lastReminderAt: null,
    });
    // Before the Stripe session closes it, the row is still pending.
    expect(cardBooking([booking({ status: "pending" })], new Map(), now)?.payment).toBe(
      "Unpaid",
    );
  });

  it("shows nothing for an unpaid checkout whose departure is past, or a cancelled one", () => {
    expect(cardBooking([booking({ date: "2026-11-11" })], new Map(), now)).toBeNull();
    expect(cardBooking([booking({ status: "cancelled" })], new Map(), now)).toBeNull();
    expect(cardBooking([], new Map(), now)).toBeNull();
  });

  it("offers no reminder while the guest is on the payment form", () => {
    const row = booking({ status: "pending", holdExpiresAt: live });
    expect(cardBooking([row], new Map(), now)).toMatchObject({
      payment: "In checkout",
      canRemind: false,
    });
  });

  it("keeps the paid booking when the guest came back and paid", () => {
    const abandoned = booking();
    const paid = booking({ id: "bbbbbbbb-2222-4222-8222-222222222222", status: "confirmed" });
    expect(cardBooking([abandoned, paid], new Map(), now)).toMatchObject({
      row: paid,
      payment: "Paid in full",
      canRemind: false,
    });
  });

  it("does not remind an older attempt behind a newer one", () => {
    const paid = booking({ status: "confirmed" });
    const newer = booking({ id: "bbbbbbbb-2222-4222-8222-222222222222", date: "2026-11-01" });
    // The newest booking is past, so nothing can be reminded: the card keeps the paid one.
    expect(cardBooking([paid, newer], new Map(), now)).toMatchObject({
      row: paid,
      canRemind: false,
    });
  });

  it("shows a reminded booking as awaiting payment, with the time of the last reminder", () => {
    const sentAt = new Date("2026-11-12T14:05:00Z");
    const row = booking({ status: "pending", paymentLinkTokenHash: "hmac-sha256$x" });
    expect(
      cardBooking([row], new Map([[row.id, { sent: 1, lastSentAt: sentAt }]]), now),
    ).toEqual({ row, payment: "Awaiting payment", canRemind: true, lastReminderAt: sentAt });
  });

  it("leaves a link the team registered to its own button", () => {
    const row = booking({ status: "pending", paymentLinkTokenHash: "hmac-sha256$x" });
    expect(cardBooking([row], new Map(), now)).toMatchObject({
      payment: "Awaiting payment",
      canRemind: false,
      lastReminderAt: null,
    });
  });

  it("puts the button on the card only for a lead with an email", () => {
    const summary = {
      ref: "AG-AAAAAA",
      value: "€120",
      payment: "Unpaid" as const,
      date: "2026-11-28",
      bookingId: "aaaaaaaa-1111-4111-8111-111111111111",
      canRemind: true,
      lastReminderAt: null,
    };
    expect(recordFromRequest(tourRequest(), summary)).toMatchObject({
      bookingId: summary.bookingId,
      payment: "Unpaid",
      canRemind: true,
    });
    expect(recordFromRequest(tourRequest({ email: "" }), summary).canRemind).toBe(false);
    expect(
      recordFromRequest(tourRequest({ anonymisedAt: new Date() }), summary).canRemind,
    ).toBe(false);
    expect(recordFromRequest(tourRequest()).canRemind).toBe(false);
  });
});
