import { describe, expect, it } from "vitest";
import {
  buildInvoiceEntries,
  INVOICE_ENTRY_KEY_RE,
  splitInvoiceList,
  type PaidBookingSource,
  type PaidInstalmentSource,
} from "@/lib/invoicing";

const BOOKING_ID = "11111111-1111-4111-8111-111111111111";
const PAYMENT_ID = "22222222-2222-4222-8222-222222222222";
const REFUND_A = "33333333-3333-4333-8333-333333333333";
const REFUND_B = "44444444-4444-4444-8444-444444444444";

function paidBooking(overrides: Partial<PaidBookingSource> = {}): PaidBookingSource {
  return {
    id: BOOKING_ID,
    ref: "BK-111111",
    // 23:30 UTC on 1 July is 00:30 on 2 July in Lisbon (UTC+1).
    paidAt: new Date("2027-07-01T23:30:00Z"),
    amountCents: 34_000,
    currency: "eur",
    refundedAmountCents: 0,
    refundedAt: null,
    guestName: "Sofia Almeida",
    taxId: "123456789",
    service: "Rural Saloia · BK-111111",
    leadId: "55555555-5555-4555-8555-555555555555",
    ...overrides,
  };
}

function paidDeposit(overrides: Partial<PaidInstalmentSource> = {}): PaidInstalmentSource {
  return {
    ...paidBooking({ id: PAYMENT_ID, service: "Orçamento QT-222222", taxId: null }),
    paidAt: new Date("2027-07-03T10:00:00Z"),
    amountCents: 57_600,
    kind: "deposit",
    ...overrides,
  };
}

describe("buildInvoiceEntries", () => {
  it("makes one line for a paid booking and one for a paid instalment, on their Lisbon day", () => {
    const entries = buildInvoiceEntries({
      bookings: [paidBooking()],
      instalments: [paidDeposit()],
      refunds: [],
    });

    expect(entries.map((entry) => [entry.key, entry.kind, entry.day, entry.amountCents])).toEqual([
      [`booking:${BOOKING_ID}`, "booking", "2027-07-02", 34_000],
      [`quote-payment:${PAYMENT_ID}`, "deposit", "2027-07-03", 57_600],
    ]);
    expect(entries[0]).toMatchObject({ guestName: "Sofia Almeida", taxId: "123456789" });
    expect(entries[1].service).toBe("Orçamento QT-222222 · Sinal");
  });

  it("makes two lines for two partial refunds of one payment", () => {
    const entries = buildInvoiceEntries({
      bookings: [
        paidBooking({ refundedAmountCents: 15_000, refundedAt: new Date("2027-07-09T09:00:00Z") }),
      ],
      instalments: [],
      refunds: [
        {
          id: REFUND_B,
          bookingId: BOOKING_ID,
          quotePaymentId: null,
          amountCents: 5_000,
          refundedAt: new Date("2027-07-09T09:00:00Z"),
        },
        {
          id: REFUND_A,
          bookingId: BOOKING_ID,
          quotePaymentId: null,
          amountCents: 10_000,
          refundedAt: new Date("2027-07-05T09:00:00Z"),
        },
      ],
    });

    const refunds = entries.filter((entry) => entry.kind === "refund");
    expect(refunds.map((entry) => [entry.key, entry.day, entry.amountCents])).toEqual([
      [`refund:${REFUND_A}`, "2027-07-05", 10_000],
      [`refund:${REFUND_B}`, "2027-07-09", 5_000],
    ]);
  });

  it("shows a refund from before the ledger once, with the total on the payment row", () => {
    const entries = buildInvoiceEntries({
      bookings: [
        paidBooking({ refundedAmountCents: 34_000, refundedAt: new Date("2027-07-04T12:00:00Z") }),
      ],
      instalments: [],
      refunds: [],
    });

    expect(entries.filter((entry) => entry.kind === "refund")).toEqual([
      expect.objectContaining({
        key: `legacy-refund:booking:${BOOKING_ID}`,
        day: "2027-07-04",
        amountCents: 34_000,
        service: "Reembolso · Rural Saloia · BK-111111",
      }),
    ]);
  });
});

describe("splitInvoiceList", () => {
  const entries = buildInvoiceEntries({
    bookings: [paidBooking()],
    instalments: [paidDeposit()],
    refunds: [],
  });

  it("lists the chosen day, with the mark and its number", () => {
    const list = splitInvoiceList(
      entries,
      [{ entryKey: `booking:${BOOKING_ID}`, documentNumber: "FR 2027/12", markedAt: new Date() }],
      { day: "2027-07-02", today: "2027-07-02" },
    );

    expect(list.day).toHaveLength(1);
    expect(list.day[0]).toMatchObject({ documentNumber: "FR 2027/12" });
    // Today is not late yet.
    expect(list.overdue).toEqual([]);
  });

  it("puts an unmarked line of a past day in overdue, and a marked one not", () => {
    const list = splitInvoiceList(
      entries,
      [{ entryKey: `quote-payment:${PAYMENT_ID}`, documentNumber: "FR 2027/13", markedAt: new Date() }],
      { day: "2027-07-10", today: "2027-07-10" },
    );

    expect(list.day).toEqual([]);
    expect(list.overdue.map((entry) => entry.key)).toEqual([`booking:${BOOKING_ID}`]);
  });
});

describe("INVOICE_ENTRY_KEY_RE", () => {
  it("accepts the keys the list makes, and nothing else", () => {
    expect(INVOICE_ENTRY_KEY_RE.test(`booking:${BOOKING_ID}`)).toBe(true);
    expect(INVOICE_ENTRY_KEY_RE.test(`quote-payment:${PAYMENT_ID}`)).toBe(true);
    expect(INVOICE_ENTRY_KEY_RE.test(`refund:${REFUND_A}`)).toBe(true);
    expect(INVOICE_ENTRY_KEY_RE.test(`legacy-refund:booking:${BOOKING_ID}`)).toBe(true);
    expect(INVOICE_ENTRY_KEY_RE.test("booking:anything")).toBe(false);
    expect(INVOICE_ENTRY_KEY_RE.test(`legacy-refund:refund:${REFUND_A}`)).toBe(false);
  });
});
