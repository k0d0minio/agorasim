import { describe, expect, it } from "vitest";

import {
  bookingHrefForTour,
  parseDraft,
  readCheckoutEntry,
  serializeDraft,
  type CheckoutDraft,
} from "@/lib/checkout-draft";

const draft: CheckoutDraft = {
  tour: "rural-saloia",
  mode: "private",
  adults: 2,
  children: 1,
  infants: 0,
  addOns: ["tasco-galapito"],
  date: "2026-09-12",
  slot: "morning",
  name: "Ana Ferreira",
  email: "ana@example.pt",
  phone: "+351 912 345 678",
  message: "Um aniversário",
};

describe("parseDraft", () => {
  it("restores everything the guest had entered", () => {
    expect(parseDraft(serializeDraft(draft))).toEqual(draft);
  });

  it("refuses anything that is not a draft of this shape", () => {
    expect(parseDraft(null)).toBeNull();
    expect(parseDraft("")).toBeNull();
    expect(parseDraft("not json")).toBeNull();
    expect(parseDraft("[1,2,3]")).toBeNull();
    expect(parseDraft(JSON.stringify({ ...draft }))).toBeNull(); // no version
    expect(parseDraft(JSON.stringify({ version: 99, ...draft }))).toBeNull();
    expect(parseDraft(serializeDraft({ ...draft, tour: "" }))).toBeNull();
  });

  it("refuses a party the site could not sell anyway", () => {
    expect(parseDraft(serializeDraft({ ...draft, adults: 0 }))).toBeNull();
    expect(parseDraft(serializeDraft({ ...draft, adults: 7, children: 4 }))).toBeNull();
    expect(parseDraft(serializeDraft({ ...draft, adults: 2.5 }))).toBeNull();
    expect(parseDraft(serializeDraft({ ...draft, children: -1 }))).toBeNull();
  });

  it("drops a departure whose day did not survive", () => {
    const restored = parseDraft(serializeDraft({ ...draft, date: null }));
    expect(restored?.slot).toBeNull();
  });

  it("drops fields it cannot read, keeping the rest", () => {
    const restored = parseDraft(
      JSON.stringify({
        version: 1,
        tour: "obidos-medieval-villages",
        mode: "nonsense",
        adults: 2,
        children: 0,
        infants: 0,
        addOns: ["tasco-galapito", 7, ""],
        date: "12/09/2026",
        slot: "midnight",
        name: "Sam",
      }),
    );
    expect(restored).toEqual({
      tour: "obidos-medieval-villages",
      // An unreadable mode falls back to the one every tour offers.
      mode: "public",
      adults: 2,
      children: 0,
      infants: 0,
      addOns: ["tasco-galapito"],
      date: null,
      slot: null,
      name: "Sam",
      email: "",
      phone: "",
      message: "",
    });
  });
});

describe("readCheckoutEntry", () => {
  it("reads the tour and the return flag Stripe sends back", () => {
    expect(readCheckoutEntry("?tour=rural-saloia&cancelled=1")).toEqual({
      tour: "rural-saloia",
      cancelled: true,
    });
  });

  it("is a fresh arrival when the flag is absent or anything else", () => {
    expect(readCheckoutEntry("")).toEqual({ tour: null, cancelled: false });
    expect(readCheckoutEntry("?tour=obidos-medieval-villages")).toEqual({
      tour: "obidos-medieval-villages",
      cancelled: false,
    });
    expect(readCheckoutEntry("?cancelled=yes").cancelled).toBe(false);
  });
});

describe("bookingHrefForTour", () => {
  it("hangs the tour off the booking page's own path", () => {
    expect(bookingHrefForTour("/pt/reservar", "rural-saloia")).toBe(
      "/pt/reservar?tour=rural-saloia",
    );
  });
});
