import { describe, expect, it } from "vitest";
import {
  ADD_ONS,
  FEATURES,
  SUITE_PRICE,
  computeTotals,
  euro,
  featurePrice,
  type Feature,
} from "./proposal";

/** Look a catalogue entry up by id, failing loudly if it has been renamed. */
function feature(id: string): Feature {
  const found = FEATURES.find((f) => f.id === id);
  if (!found) throw new Error(`No feature "${id}" in the catalogue`);
  return found;
}

function addOnPrice(id: string): number {
  const found = ADD_ONS.find((a) => a.id === id);
  if (!found) throw new Error(`No add-on "${id}" in the catalogue`);
  return found.price;
}

const allFeatureIds = new Set(FEATURES.map((f) => f.id));
const listTotal = FEATURES.reduce((sum, f) => sum + f.price, 0);

/** The bundle pair the catalogue defines: wedding hire discounted with tour booking. */
const bundled = feature("wedding");
const bundlePartner = bundled.bundleWith!;

describe("featurePrice", () => {
  it("charges list price when the bundle partner is not selected", () => {
    expect(featurePrice(bundled, new Set([bundled.id]))).toBe(bundled.price);
  });

  it("applies the bundle price when the partner is selected", () => {
    expect(featurePrice(bundled, new Set([bundled.id, bundlePartner]))).toBe(bundled.bundlePrice);
    expect(bundled.bundlePrice).toBeLessThan(bundled.price);
  });

  it("only needs the partner selected, not the feature itself", () => {
    // computeTotals filters to selected features first, so this is the contract.
    expect(featurePrice(bundled, new Set([bundlePartner]))).toBe(bundled.bundlePrice);
  });

  it("charges list price for features with no bundle at all", () => {
    const plain = feature("referral");
    expect(plain.bundlePrice).toBeUndefined();
    expect(featurePrice(plain, new Set(allFeatureIds))).toBe(plain.price);
  });
});

describe("computeTotals", () => {
  it("is all zeroes with nothing selected", () => {
    expect(computeTotals(new Set(), new Set())).toEqual({
      oneTime: 0,
      savings: 0,
      featureCount: 0,
      addOnCount: 0,
      fullSuite: false,
      featureTotal: 0,
    });
  });

  it("sums a plain selection at list price, with no savings", () => {
    const a = feature("referral");
    const b = feature("notify");
    const totals = computeTotals(new Set([a.id, b.id]), new Set());

    expect(totals.oneTime).toBe(a.price + b.price);
    expect(totals.featureTotal).toBe(a.price + b.price);
    expect(totals.savings).toBe(0);
    expect(totals.featureCount).toBe(2);
    expect(totals.fullSuite).toBe(false);
  });

  it("reports the bundle discount as savings", () => {
    const partner = feature(bundlePartner);
    const totals = computeTotals(new Set([bundled.id, partner.id]), new Set());

    expect(totals.featureTotal).toBe(bundled.bundlePrice! + partner.price);
    expect(totals.savings).toBe(bundled.price - bundled.bundlePrice!);
  });

  it("charges the suite price once every feature is selected", () => {
    const totals = computeTotals(allFeatureIds, new Set());

    expect(totals.fullSuite).toBe(true);
    expect(totals.featureTotal).toBe(SUITE_PRICE);
    expect(totals.oneTime).toBe(SUITE_PRICE);
    expect(totals.savings).toBe(listTotal - SUITE_PRICE);
    expect(totals.savings).toBeGreaterThan(0);
  });

  it("takes the suite price rather than the bundle price when both could apply", () => {
    // The full suite includes the bundle pair; the suite must not be discounted twice.
    expect(computeTotals(allFeatureIds, new Set()).featureTotal).toBe(SUITE_PRICE);
  });

  it("adds add-ons to the total but leaves the feature gauge alone", () => {
    const featureIds = new Set([feature("referral").id]);
    const extras = addOnPrice("gift") + addOnPrice("reviews");
    const totals = computeTotals(featureIds, new Set(["gift", "reviews"]));

    expect(totals.addOnCount).toBe(2);
    expect(totals.oneTime).toBe(feature("referral").price + extras);
    // `featureTotal` drives the progress ring, which measures features only.
    expect(totals.featureTotal).toBe(feature("referral").price);
    expect(totals.savings).toBe(0);
  });

  it("ignores ids that are not in the catalogue", () => {
    const totals = computeTotals(new Set(["nope", "also-nope"]), new Set(["still-nope"]));
    expect(totals).toEqual(computeTotals(new Set(), new Set()));
  });

  it("never treats a partial selection as the full suite", () => {
    const allButOne = new Set([...allFeatureIds].slice(0, -1));
    expect(computeTotals(allButOne, new Set()).fullSuite).toBe(false);
  });
});

describe("euro", () => {
  it("groups thousands", () => {
    expect(euro(7900)).toBe("7,900");
    expect(euro(700)).toBe("700");
    expect(euro(0)).toBe("0");
  });
});
