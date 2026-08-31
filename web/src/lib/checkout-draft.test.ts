import { describe, expect, it } from "vitest";

import {
  CANCEL_RETURN_PARAM,
  CANCEL_RETURN_VALUE,
  draftFromFormData,
  isCancelReturn,
  parseCheckoutDraft,
  tourFromSearch,
} from "@/lib/checkout-draft";

/** The form data a filled-in checkout posts, as a starting point. */
function submitted(overrides: Record<string, string | string[]> = {}): FormData {
  const base: Record<string, string | string[]> = {
    experience: "obidos-medieval-villages",
    mode: "private",
    adults: "3",
    children: "1",
    infants: "0",
    addOns: ["tasco-galapito", "manzwine"],
    date: "2026-09-14",
    slot: "afternoon",
    name: "  Rita Nunes  ",
    email: "rita@example.pt",
    phone: "+351 919 272 077",
    message: "Aniversário",
    ...overrides,
  };
  const form = new FormData();
  for (const [key, value] of Object.entries(base)) {
    for (const one of Array.isArray(value) ? value : [value]) form.append(key, one);
  }
  return form;
}

describe("draftFromFormData", () => {
  it("keeps everything a guest would hate to retype", () => {
    expect(draftFromFormData(submitted())).toEqual({
      tour: "obidos-medieval-villages",
      mode: "private",
      adults: 3,
      children: 1,
      infants: 0,
      addOns: ["tasco-galapito", "manzwine"],
      date: "2026-09-14",
      slot: "afternoon",
      name: "Rita Nunes",
      email: "rita@example.pt",
      phone: "+351 919 272 077",
      message: "Aniversário",
    });
  });

  it("never carries the marketing opt-in", () => {
    const draft = draftFromFormData(submitted({ marketingConsent: "on" }));
    // Consent has to be given afresh every time; a restored tick would be a
    // consent nobody gave on this visit.
    expect(draft).not.toHaveProperty("marketingConsent");
  });

  it("drops the fields that were left blank rather than storing empties", () => {
    const draft = draftFromFormData(submitted({ phone: "  ", message: "", slot: "" }));
    expect(draft).not.toHaveProperty("phone");
    expect(draft).not.toHaveProperty("message");
    expect(draft).not.toHaveProperty("slot");
    expect(draft.name).toBe("Rita Nunes");
  });

  it("keeps nothing it cannot recognise", () => {
    const draft = draftFromFormData(
      submitted({
        experience: "Rural Saloia",
        mode: "free",
        date: "next tuesday",
        slot: "midnight",
        addOns: ["tasco-galapito", "NOT A SLUG"],
      }),
    );
    expect(draft.tour).toBeUndefined();
    expect(draft.mode).toBeUndefined();
    expect(draft.date).toBeUndefined();
    expect(draft.slot).toBeUndefined();
    expect(draft.addOns).toEqual(["tasco-galapito"]);
  });
});

describe("parseCheckoutDraft", () => {
  it("round-trips what the form stored", () => {
    const draft = draftFromFormData(submitted());
    expect(parseCheckoutDraft(JSON.stringify(draft))).toEqual(draft);
  });

  it("returns null for nothing, rubbish, or a draft with nothing left in it", () => {
    expect(parseCheckoutDraft(null)).toBeNull();
    expect(parseCheckoutDraft("")).toBeNull();
    expect(parseCheckoutDraft("{ not json")).toBeNull();
    expect(parseCheckoutDraft("[1, 2, 3]")).toBeNull();
    expect(parseCheckoutDraft('"a string"')).toBeNull();
    expect(parseCheckoutDraft("{}")).toBeNull();
    expect(parseCheckoutDraft('{"tour": 42, "adults": "lots"}')).toBeNull();
  });

  it("refuses a party bigger than the site sells, and non-integer counts", () => {
    expect(parseCheckoutDraft('{"adults": 99}')).toBeNull();
    expect(parseCheckoutDraft('{"adults": -1}')).toBeNull();
    expect(parseCheckoutDraft('{"adults": 2.5}')).toBeNull();
    expect(parseCheckoutDraft('{"adults": 8}')).toEqual({ adults: 8 });
  });

  it("caps a free-text field that has been inflated in storage", () => {
    const huge = JSON.stringify({ message: "x".repeat(50_000) });
    expect(parseCheckoutDraft(huge)?.message).toHaveLength(2000);
  });
});

describe("the flags on the URL", () => {
  it("recognises Stripe's cancel-return and nothing else", () => {
    expect(isCancelReturn(`?${CANCEL_RETURN_PARAM}=${CANCEL_RETURN_VALUE}`)).toBe(true);
    expect(isCancelReturn(`?tour=rural-saloia&${CANCEL_RETURN_PARAM}=cancelled`)).toBe(true);
    expect(isCancelReturn("")).toBe(false);
    expect(isCancelReturn("?checkout=done")).toBe(false);
  });

  it("reads a tour an experience page named, and only a plausible one", () => {
    expect(tourFromSearch("?tour=obidos-medieval-villages")).toBe("obidos-medieval-villages");
    expect(tourFromSearch("?tour=")).toBeNull();
    expect(tourFromSearch("?tour=../../etc/passwd")).toBeNull();
    expect(tourFromSearch("?other=1")).toBeNull();
  });
});
