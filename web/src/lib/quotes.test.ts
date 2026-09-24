import { describe, expect, it } from "vitest";

import {
  BALANCE_DUE_DAYS_BEFORE,
  balanceDueDate,
  canCopyAsNewVersion,
  canStartQuote,
  canTransition,
  DEFAULT_DEPOSIT_PERCENT,
  isEditable,
  isInsideNonRefundableWindow,
  LEAD_STAGE_ORDER,
  leadStageAfterQuote,
  leadStagesThatMayBecome,
  lineItemsTotal,
  QUOTE_TRANSITIONS,
  quoteRef,
  shiftDays,
  splitTotal,
  statusAfterPayment,
  statusesThatMayBecome,
  validateQuoteInput,
  wasSuperseded,
  type NewQuoteInput,
} from "@/lib/quotes";
import type { QuotePayment, QuoteStatus, RequestStatus } from "@/db";

/**
 * The quote layer's arithmetic and its rules, without a database.
 *
 * Three things here cost somebody real money when they are wrong: a split whose
 * halves do not add up to what the couple were quoted, a balance due date that
 * drifts a day across a clock change, and a state machine that lets a paid
 * instalment be asked for again. The queries themselves are typed and covered
 * by the build, per the note in `sales.test.ts`.
 */

const payment = (
  kind: QuotePayment["kind"],
  status: QuotePayment["status"],
): Pick<QuotePayment, "kind" | "status"> => ({ kind, status });

describe("quoteRef", () => {
  it("is short, stable and derived from the id", () => {
    const id = "abcdef12-0000-0000-0000-000000000000";
    expect(quoteRef(id)).toBe("QT-ABCDEF");
    expect(quoteRef(id)).toBe(quoteRef(id));
  });
});

describe("splitTotal", () => {
  it("takes the agreement's 30% by default", () => {
    expect(splitTotal(100_000)).toEqual({ depositCents: 30_000, balanceCents: 70_000 });
    expect(DEFAULT_DEPOSIT_PERCENT).toBe(30);
  });

  it("always sums to the total, whatever the rounding", () => {
    // 30% of €1,235.00 is €370.50; of €1,234.57 it is a third of a cent short.
    for (const total of [123_500, 123_457, 1, 99, 333_333, 1_000_001]) {
      for (const percent of [1, 30, 33, 50, 66, 99, 100]) {
        const { depositCents, balanceCents } = splitTotal(total, percent);
        expect(depositCents + balanceCents).toBe(total);
        expect(Number.isInteger(depositCents)).toBe(true);
        expect(balanceCents).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("leaves nothing for the balance at 100%", () => {
    expect(splitTotal(50_000, 100)).toEqual({ depositCents: 50_000, balanceCents: 0 });
  });

  it("refuses money that is not whole cents, and shares that are not shares", () => {
    expect(() => splitTotal(100.5)).toThrow(/whole number of cents/);
    expect(() => splitTotal(0)).toThrow(/whole number of cents/);
    expect(() => splitTotal(-100)).toThrow(/whole number of cents/);
    expect(() => splitTotal(100_000, 0)).toThrow(/between 1 and 100/);
    expect(() => splitTotal(100_000, 101)).toThrow(/between 1 and 100/);
    expect(() => splitTotal(100_000, 30.5)).toThrow(/between 1 and 100/);
  });
});

describe("lineItemsTotal", () => {
  it("is zero for a quote that is a single agreed figure", () => {
    expect(lineItemsTotal([])).toBe(0);
  });

  it("multiplies out every line", () => {
    expect(
      lineItemsTotal([
        { label: "4 carros clássicos", unitCents: 45_000, quantity: 4 },
        { label: "Deslocação Ericeira", unitCents: 12_000, quantity: 1 },
      ]),
    ).toBe(192_000);
  });
});

describe("shiftDays and balanceDueDate", () => {
  it("counts calendar days, across months and years", () => {
    expect(shiftDays("2026-08-15", -14)).toBe("2026-08-01");
    expect(shiftDays("2026-03-05", -14)).toBe("2026-02-19");
    expect(shiftDays("2027-01-07", -14)).toBe("2026-12-24");
    expect(shiftDays("2028-03-01", -1)).toBe("2028-02-29");
  });

  it("does not lose a day to the clocks changing", () => {
    // Portugal leaves summer time on 2026-10-25; a local-midnight calculation
    // would land on the 25th here and quietly make the window 13 days.
    expect(balanceDueDate("2026-11-07")).toBe("2026-10-24");
    expect(balanceDueDate("2026-04-10")).toBe("2026-03-27");
    expect(BALANCE_DUE_DAYS_BEFORE).toBe(14);
  });

  it("refuses a date that is not a calendar day", () => {
    expect(() => shiftDays("late August", -14)).toThrow(/YYYY-MM-DD/);
    expect(() => shiftDays("2026-02-31", -14)).toThrow(/YYYY-MM-DD/);
  });
});

describe("isInsideNonRefundableWindow", () => {
  const quote = { eventDate: "2026-08-15", termsWindowDays: 30 };

  it("is open until the window opens", () => {
    expect(isInsideNonRefundableWindow(quote, new Date("2026-07-15T12:00:00Z"))).toBe(false);
  });

  it("closes on the first day of the window, in Lisbon terms", () => {
    // 30 days before the 15th of August is the 16th of July.
    expect(isInsideNonRefundableWindow(quote, new Date("2026-07-16T00:30:00Z"))).toBe(true);
    // 23:30 UTC on the 15th is already the 16th in Sintra (UTC+1 in summer).
    expect(isInsideNonRefundableWindow(quote, new Date("2026-07-15T23:30:00Z"))).toBe(true);
  });

  it("stays closed through the event", () => {
    expect(isInsideNonRefundableWindow(quote, new Date("2026-08-15T09:00:00Z"))).toBe(true);
  });
});

describe("the quote state machine", () => {
  it("lets a draft be sent and a sent quote be re-sent", () => {
    expect(canTransition("draft", "sent")).toBe(true);
    expect(canTransition("sent", "sent")).toBe(true);
  });

  it("never un-sends a quote the couple have seen", () => {
    expect(canTransition("sent", "draft")).toBe(false);
    expect(canTransition("deposit_paid", "draft")).toBe(false);
    expect(canTransition("deposit_paid", "sent")).toBe(false);
  });

  it("treats cancelled as terminal and cancellation as always available", () => {
    expect(QUOTE_TRANSITIONS.cancelled).toEqual([]);
    expect(statusesThatMayBecome("cancelled")).toEqual([
      "draft",
      "sent",
      "deposit_paid",
      "paid",
    ]);
  });

  it("only lets a draft be edited", () => {
    const statuses: QuoteStatus[] = ["draft", "sent", "deposit_paid", "paid", "cancelled"];
    expect(statuses.filter((status) => isEditable({ status }))).toEqual(["draft"]);
  });
});

describe("statusAfterPayment", () => {
  it("holds the date when the deposit lands", () => {
    expect(
      statusAfterPayment("sent", [payment("deposit", "paid"), payment("balance", "pending")]),
    ).toBe("deposit_paid");
  });

  it("completes when nothing is outstanding", () => {
    expect(
      statusAfterPayment("deposit_paid", [payment("deposit", "paid"), payment("balance", "paid")]),
    ).toBe("paid");
  });

  it("counts a written-off instalment as settled", () => {
    // The deposit came by bank transfer, so it is cancelled rather than paid;
    // the balance arriving is still the whole of the money.
    expect(
      statusAfterPayment("sent", [
        payment("deposit", "cancelled"),
        payment("balance", "paid"),
      ]),
    ).toBe("paid");
  });

  it("holds the date on a deposit written off — the bank-transfer case", () => {
    /*
      The couple transferred the deposit, so the team wrote the instalment off
      rather than taking it through Stripe. Reading only `paid` here left the
      quote at `sent`, which `listQuotesDueForBalance` filters out: they paid,
      and their balance was then never asked for.
    */
    expect(
      statusAfterPayment("sent", [
        payment("deposit", "cancelled"),
        payment("balance", "pending"),
      ]),
    ).toBe("deposit_paid");
  });

  it("does not move on a balance paid before the deposit", () => {
    expect(
      statusAfterPayment("sent", [payment("deposit", "issued"), payment("balance", "paid")]),
    ).toBe("sent");
  });

  it("leaves a cancelled quote cancelled, and an empty one alone", () => {
    expect(statusAfterPayment("cancelled", [payment("deposit", "paid")])).toBe("cancelled");
    expect(statusAfterPayment("draft", [])).toBe("draft");
  });
});

describe("leadStageAfterQuote", () => {
  it("moves a lead forward when the offer goes out and when the deposit lands", () => {
    expect(leadStageAfterQuote("new", "quoted")).toBe("quoted");
    expect(leadStageAfterQuote("contacted", "quoted")).toBe("quoted");
    expect(leadStageAfterQuote("quoted", "booked")).toBe("booked");
    expect(leadStageAfterQuote("new", "booked")).toBe("booked");
  });

  it("never walks a lead backwards", () => {
    // A re-sent quote must not pull a couple who have already paid out of
    // `Reservado` and back into `Orçamentado`.
    expect(leadStageAfterQuote("booked", "quoted")).toBeNull();
    expect(leadStageAfterQuote("quoted", "quoted")).toBeNull();
    expect(leadStageAfterQuote("booked", "booked")).toBeNull();
  });

  it("leaves an archived lead archived — a webhook does not overrule a person", () => {
    expect(leadStageAfterQuote("archived", "quoted")).toBeNull();
    expect(leadStageAfterQuote("archived", "booked")).toBeNull();
    expect(LEAD_STAGE_ORDER).not.toContain("archived");
  });

  it("states the same rule as the set of stages the write may land on", () => {
    const stages: RequestStatus[] = [...LEAD_STAGE_ORDER, "archived"];
    for (const target of ["quoted", "booked"] as const) {
      expect(leadStagesThatMayBecome(target)).toEqual(
        stages.filter((stage) => leadStageAfterQuote(stage, target) !== null),
      );
    }
  });
});

describe("validateQuoteInput", () => {
  const base: NewQuoteInput = {
    tourRequestId: "11111111-1111-1111-1111-111111111111",
    eventDate: "2026-08-15",
    totalCents: 192_000,
  };

  it("accepts a bespoke figure with no lines behind it", () => {
    expect(validateQuoteInput(base)).toEqual([]);
  });

  it("refuses the free-text dates the enquiry form allows", () => {
    expect(validateQuoteInput({ ...base, eventDate: "late August" })).toEqual([
      expect.stringContaining("not a YYYY-MM-DD"),
    ]);
  });

  it("refuses money that is not whole positive cents", () => {
    expect(validateQuoteInput({ ...base, totalCents: 0 })).toHaveLength(1);
    expect(validateQuoteInput({ ...base, totalCents: 1920.5 })).toHaveLength(1);
  });

  it("refuses lines that do not add up to the total", () => {
    expect(
      validateQuoteInput({
        ...base,
        lineItems: [{ label: "Carros", unitCents: 45_000, quantity: 4 }],
      }),
    ).toEqual([expect.stringContaining("must agree")]);
  });

  it("accepts lines that do", () => {
    expect(
      validateQuoteInput({
        ...base,
        lineItems: [
          { label: "4 carros clássicos", unitCents: 45_000, quantity: 4 },
          { label: "Deslocação Ericeira", unitCents: 12_000, quantity: 1 },
        ],
      }),
    ).toEqual([]);
  });

  it("reports every problem at once, so a form can show them together", () => {
    expect(
      validateQuoteInput({
        ...base,
        eventDate: "2026-02-31",
        totalCents: -1,
        depositPercent: 250,
        termsWindowDays: -5,
      }),
    ).toHaveLength(4);
  });
});

/**
 * The builder's per-lead rules: at most one draft and one live quote, a new
 * version only of an unpaid sent quote, and "Substituído" only for a quote a
 * later version replaced.
 */
describe("the quote builder's rules for one lead", () => {
  const at = (iso: string) => new Date(iso);

  it("starts a quote only when every earlier one is cancelled", () => {
    expect(canStartQuote([])).toBe(true);
    expect(canStartQuote([{ status: "cancelled" }, { status: "cancelled" }])).toBe(true);
    for (const status of ["draft", "sent", "deposit_paid", "paid"] as const) {
      expect(canStartQuote([{ status: "cancelled" }, { status }])).toBe(false);
    }
  });

  it("offers a new version of a sent quote, unless a draft is already waiting", () => {
    expect(canCopyAsNewVersion({ status: "sent" }, [{ status: "sent" }])).toBe(true);
    expect(
      canCopyAsNewVersion({ status: "sent" }, [{ status: "sent" }, { status: "draft" }]),
    ).toBe(false);
    for (const status of ["draft", "deposit_paid", "paid", "cancelled"] as const) {
      expect(canCopyAsNewVersion({ status }, [{ status }])).toBe(false);
    }
  });

  it("calls a quote superseded only when a later version was sent", () => {
    const old = {
      status: "cancelled" as const,
      sentAt: at("2026-05-01T10:00:00Z"),
      createdAt: at("2026-05-01T09:00:00Z"),
    };
    const newer = { sentAt: at("2026-05-03T10:00:00Z"), createdAt: at("2026-05-02T09:00:00Z") };
    const newerDraft = { sentAt: null, createdAt: at("2026-05-02T09:00:00Z") };

    expect(wasSuperseded(old, [old, newer])).toBe(true);
    // Replaced only once the copy is sent — a waiting draft replaces nothing.
    expect(wasSuperseded(old, [old, newerDraft])).toBe(false);
    // A discarded draft was never sent, so it was never replaced.
    expect(wasSuperseded({ ...old, sentAt: null }, [old, newer])).toBe(false);
    expect(wasSuperseded({ ...old, status: "sent" }, [old, newer])).toBe(false);
  });
});
