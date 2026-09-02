import { describe, expect, it } from "vitest";

import { COMMISSION_RATES, commissionOn } from "@/lib/commission";

/**
 * The Commission & Payments Agreement, made executable.
 *
 * Every figure below is a row of
 * `.icm/docs/agorasim-commission-and-payments-agreement.pdf` — §4's four tour
 * examples and §5's two event ones. Both parties are meant to be able to check
 * a fee against the Stripe dashboard at any time; this suite is the same check
 * run against the code. If one of these breaks, the question is not "which
 * assertion is stale?" but "was the agreement amended?" — which §9 says only
 * happens in writing.
 */

/** €150 → 15000 cents, so the examples below read as the document does. */
const euros = (amount: number) => Math.round(amount * 100);

describe("tour commission (§4 — 4%, floor €10, cap €50)", () => {
  it("takes the €10 floor on a couple with one tasting add-on (€150)", () => {
    const commission = commissionOn("tour", euros(150));

    // 4% of €150 is €6, which the floor lifts to €10.
    expect(commission.feeCents).toBe(euros(10));
    expect(commission.bound).toBe("floor");
    expect(commission.rateBps).toBe(400);
  });

  it("takes ≈€19 on a small-group day for two (€470)", () => {
    const commission = commissionOn("tour", euros(470));

    // The document rounds to "≈ €19"; the charge is the exact €18.80.
    expect(commission.feeCents).toBe(euros(18.8));
    expect(commission.bound).toBe("rate");
  });

  it("takes €36 on a private full day for a family of four (€900)", () => {
    const commission = commissionOn("tour", euros(900));

    expect(commission.feeCents).toBe(euros(36));
    expect(commission.bound).toBe("rate");
  });

  it("takes the €50 cap on a private day with add-ons for six (€1,400)", () => {
    const commission = commissionOn("tour", euros(1400));

    // 4% of €1,400 is €56 — the cap is what stops a large group over-paying.
    expect(commission.feeCents).toBe(euros(50));
    expect(commission.bound).toBe("cap");
  });
});

describe("event commission (§5 — 6%, no floor, no cap)", () => {
  it("takes €48 on a smaller event (€800)", () => {
    const commission = commissionOn("event", euros(800));

    expect(commission.feeCents).toBe(euros(48));
    expect(commission.rateBps).toBe(600);
    expect(commission.bound).toBe("rate");
  });

  it("takes €90 on a larger event (€1,500)", () => {
    const commission = commissionOn("event", euros(1500));

    expect(commission.feeCents).toBe(euros(90));
    expect(commission.bound).toBe("rate");
  });

  /**
   * §5's actual mechanism: a 30% deposit now, the balance 14 days out, "6% of
   * the deposit when the deposit is paid, and 6% of the balance when the
   * balance is paid — so it always nets to exactly 6% of the whole booking".
   */
  it("nets to 6% of the whole when taken on a deposit and a balance", () => {
    const total = euros(1500);
    const deposit = Math.round(total * 0.3);
    const balance = total - deposit;

    const onDeposit = commissionOn("event", deposit).feeCents;
    const onBalance = commissionOn("event", balance).feeCents;

    expect(onDeposit + onBalance).toBe(commissionOn("event", total).feeCents);
  });

  it("applies no floor — an event fee under €10 is charged as computed", () => {
    // Nothing on the price list is this small; the point is that the tour
    // table's floor is not silently shared with §5.
    expect(commissionOn("event", euros(100)).feeCents).toBe(euros(6));
    expect(COMMISSION_RATES.event.floorCents).toBeNull();
  });

  it("applies no cap — a €10,000 wedding pays the full 6%", () => {
    expect(commissionOn("event", euros(10_000)).feeCents).toBe(euros(600));
    expect(COMMISSION_RATES.event.capCents).toBeNull();
  });
});

describe("the edges of the tour bounds", () => {
  it("reads as the rate, not the floor, at the total where they meet (€250)", () => {
    // 4% of €250 is exactly €10: the rate produced it, the floor merely agrees.
    const commission = commissionOn("tour", euros(250));

    expect(commission.feeCents).toBe(euros(10));
    expect(commission.bound).toBe("rate");
  });

  it("reads as the rate, not the cap, at the total where they meet (€1,250)", () => {
    const commission = commissionOn("tour", euros(1250));

    expect(commission.feeCents).toBe(euros(50));
    expect(commission.bound).toBe("rate");
  });

  /**
   * At 4%, one cent of commission is 25 cents of total — so the bound takes
   * over only once rounding actually pushes the fee past it, not at the first
   * cent either side of the meeting point.
   */
  it("holds the fee at the cap once the rate would exceed it", () => {
    const commission = commissionOn("tour", euros(1250.25));

    expect(commission.feeCents).toBe(euros(50));
    expect(commission.bound).toBe("cap");
  });

  it("lifts the fee to the floor once the rate falls under it", () => {
    const commission = commissionOn("tour", euros(249.75));

    expect(commission.feeCents).toBe(euros(10));
    expect(commission.bound).toBe("floor");
  });
});

describe("arithmetic", () => {
  it("rounds a half-cent of commission to the nearest cent", () => {
    // 4% of €470.13 is €18.8052 → €18.81, not €18.80.
    expect(commissionOn("tour", euros(470.13)).feeCents).toBe(1881);
    // 4% of €301.12 is €12.0448 → €12.04.
    expect(commissionOn("tour", euros(301.12)).feeCents).toBe(1204);
  });

  it("owes nothing on a payment of nothing — the floor is not a fee to invent", () => {
    const commission = commissionOn("tour", 0);

    expect(commission.feeCents).toBe(0);
    expect(commission.bound).toBe("rate");
  });

  it("never charges more than the payment it comes out of", () => {
    // Below €10 the floor outruns the total. Stripe rejects an application fee
    // larger than its charge, so the fee is the whole of it and no more.
    const commission = commissionOn("tour", euros(7));

    expect(commission.feeCents).toBe(euros(7));
    expect(commission.bound).toBe("floor");
  });

  it("refuses a total that is not a whole number of cents", () => {
    expect(() => commissionOn("tour", 15000.5)).toThrow(/whole number of cents/);
    expect(() => commissionOn("tour", -1)).toThrow(/whole number of cents/);
    expect(() => commissionOn("tour", Number.NaN)).toThrow(/whole number of cents/);
  });

  it("keeps the basis it was asked about, for the audit row", () => {
    expect(commissionOn("tour", euros(900)).basisCents).toBe(euros(900));
  });
});
