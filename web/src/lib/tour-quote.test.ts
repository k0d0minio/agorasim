import { describe, expect, it } from "vitest";

import { noVehicles } from "@/lib/fleet";
import {
  ADMIN_QUOTE_SOURCE,
  commissionKindOf,
  heldDepartures,
  isQuotableLead,
  isQuotedKind,
  isTourQuote,
  tourHoldFits,
  tourHoldOf,
} from "@/lib/tour-quote";

/**
 * The tour quote's rules — the four ways it differs from a wedding quote — as
 * pure functions: which quote is a tour quote, which fee it takes, which
 * departures it holds, and which lead may be quoted at all. Written from the
 * acceptance criteria of `payment-link-from-scratch` and Jamie's answers on the
 * pull request (a tour quote holds a car; one payment; no quote for a tour
 * request from the site).
 */

const NOW = new Date("2026-06-01T10:00:00Z");

describe("tourHoldOf — what a quote row holds", () => {
  it("reads a tour quote's departure and car", () => {
    expect(tourHoldOf({ holdSlot: "morning", holdVehicleClass: "classic-small" })).toEqual({
      slot: "morning",
      vehicleClass: "classic-small",
    });
  });

  it("holds nothing on a wedding or event quote", () => {
    expect(tourHoldOf({ holdSlot: null, holdVehicleClass: null })).toBeNull();
    expect(tourHoldOf({})).toBeNull();
  });

  it("holds nothing on half a hold or a class the fleet does not know", () => {
    expect(tourHoldOf({ holdSlot: "morning", holdVehicleClass: null })).toBeNull();
    expect(tourHoldOf({ holdSlot: null, holdVehicleClass: "classic-small" })).toBeNull();
    expect(tourHoldOf({ holdSlot: "morning", holdVehicleClass: "hovercraft" })).toBeNull();
  });
});

describe("the fee — 4% for a tour quote, 6% for an event", () => {
  it("takes the tour rate on a quote that holds a car", () => {
    const tour = { holdSlot: "afternoon", holdVehicleClass: "classic-van" } as const;
    expect(isTourQuote(tour)).toBe(true);
    expect(commissionKindOf(tour)).toBe("tour");
  });

  it("takes the events rate on a wedding or event quote", () => {
    const wedding = { holdSlot: null, holdVehicleClass: null };
    expect(isTourQuote(wedding)).toBe(false);
    expect(commissionKindOf(wedding)).toBe("event");
  });
});

describe("heldDepartures", () => {
  it("holds one departure, or both for the whole day", () => {
    expect(heldDepartures("morning")).toEqual(["morning"]);
    expect(heldDepartures("afternoon")).toEqual(["afternoon"]);
    expect(heldDepartures("full_day")).toEqual(["morning", "afternoon"]);
  });
});

describe("isQuotableLead — who may be quoted", () => {
  it("quotes a wedding and an event, as before", () => {
    expect(isQuotableLead({ kind: "wedding", anonymisedAt: null, source: "website" })).toBe(true);
    expect(isQuotableLead({ kind: "event", anonymisedAt: null, source: "website" })).toBe(true);
  });

  it("quotes a tour only when the team raised it from Novo orçamento", () => {
    expect(isQuotableLead({ kind: "tour", anonymisedAt: null, source: ADMIN_QUOTE_SOURCE })).toBe(
      true,
    );
    // A tour request from the site, or one booked on the phone, is sold.
    expect(isQuotableLead({ kind: "tour", anonymisedAt: null, source: "website" })).toBe(false);
    expect(isQuotableLead({ kind: "tour", anonymisedAt: null, source: "phone" })).toBe(false);
    expect(isQuotableLead({ kind: "tour", anonymisedAt: null })).toBe(false);
  });

  it("quotes nobody who was anonymised", () => {
    expect(isQuotableLead({ kind: "wedding", anonymisedAt: NOW, source: "website" })).toBe(false);
    expect(isQuotableLead({ kind: "tour", anonymisedAt: NOW, source: ADMIN_QUOTE_SOURCE })).toBe(
      false,
    );
  });

  it("shows the Orçamento card by the same rule, erasure aside", () => {
    expect(isQuotedKind({ kind: "tour", source: ADMIN_QUOTE_SOURCE })).toBe(true);
    expect(isQuotedKind({ kind: "tour", source: "website" })).toBe(false);
    expect(isQuotedKind({ kind: "wedding", source: "website" })).toBe(true);
  });
});

describe("tourHoldFits — a driver and a car of the class", () => {
  const free = () => ({ ...noVehicles(), "classic-small": 2, "classic-van": 1 });
  const departure = (overrides: Record<string, unknown> = {}) => ({
    onSale: true,
    heldByEvent: false,
    driversLeft: 1,
    vehiclesLeft: free(),
    ...overrides,
  });

  it("fits where a driver and a car of the class are free", () => {
    expect(tourHoldFits(departure(), "classic-small")).toBe(true);
    expect(tourHoldFits(departure(), "classic-van")).toBe(true);
  });

  it("refuses a class with no car left", () => {
    expect(tourHoldFits(departure(), "touring")).toBe(false);
  });

  it("refuses a departure with no driver left", () => {
    expect(tourHoldFits(departure({ driversLeft: 0 }), "classic-small")).toBe(false);
  });

  it("refuses a day an event holds, and a departure the team cannot sell", () => {
    expect(tourHoldFits(departure({ heldByEvent: true }), "classic-small")).toBe(false);
    expect(tourHoldFits(departure({ onSale: false }), "classic-small")).toBe(false);
  });
});
