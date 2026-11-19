import { describe, expect, it } from "vitest";

import { HONEYPOT_FIELD, HONEYPOT_INPUT_PROPS, HONEYPOT_LABEL, isHoneypotHit } from "./honeypot";

/*
 * Chrome filled the old trap `company_website` from a saved address and three
 * wedding enquiries were lost (feedback round 2, 2026-11-11). Autofill matches
 * on the name, the id and the label, so none of them may carry a word that
 * reads as a profile field.
 */
const AUTOFILL_WORDS =
  /company|organi[sz]ation|org|website|url|name|mail|phone|tel|address|street|city|zip|postal|country|user|login|pass/i;

describe("the honeypot field", () => {
  it("has a name and a label that autofill does not match", () => {
    expect(HONEYPOT_FIELD).not.toMatch(AUTOFILL_WORDS);
    expect(HONEYPOT_LABEL).not.toMatch(AUTOFILL_WORDS);
  });

  it("opts out of autofill and of the password managers", () => {
    expect(HONEYPOT_INPUT_PROPS).toMatchObject({
      autoComplete: "off",
      tabIndex: -1,
      "data-1p-ignore": true,
      "data-lpignore": "true",
      "data-bwignore": "true",
    });
  });

  it("is hit only when the field holds text", () => {
    expect(isHoneypotHit({})).toBe(false);
    expect(isHoneypotHit({ [HONEYPOT_FIELD]: "   " })).toBe(false);
    expect(isHoneypotHit({ [HONEYPOT_FIELD]: "x" })).toBe(true);
  });
});
