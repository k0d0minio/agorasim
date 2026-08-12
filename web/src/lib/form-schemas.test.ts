import { describe, expect, it } from "vitest";

import { bookingCheckoutSchema } from "@/lib/form-schemas";

/**
 * The checkout schema's field names, pinned.
 *
 * This exists because of a bug that reached production: the date picker posted
 * `preferredDate` (the enquiry form's field) while this schema read `date`, so
 * every attempt to pay failed validation on a day the guest could plainly see
 * they had chosen. Nothing type-checked it — a form field name is a string on
 * one side and a schema key on the other, and the two only meet at runtime.
 *
 * The structural fix is that `BookingDatePicker` now requires its `name` prop,
 * so no caller can drift by accident. This is the other half: if the schema
 * key is ever renamed, the test that names it out loud fails.
 */

/** A complete, valid submission — the shape the form is expected to post. */
function submission(overrides: Record<string, unknown> = {}) {
  return {
    name: "Sofia Almeida",
    email: "Sofia@Example.com",
    phone: "+351912345678",
    message: "Fazemos anos nesse dia.",
    date: "2026-08-15",
    experience: "rural-saloia",
    addOns: ["manzwine"],
    partySize: "2",
    marketingConsent: "on",
    ...overrides,
  };
}

describe("bookingCheckoutSchema", () => {
  it("accepts what the checkout form posts", () => {
    const parsed = bookingCheckoutSchema.safeParse(submission());
    expect(parsed.success).toBe(true);
    expect(parsed.data).toMatchObject({
      name: "Sofia Almeida",
      // Lower-cased so the lead matches however they typed it.
      email: "sofia@example.com",
      date: "2026-08-15",
      experience: "rural-saloia",
      addOns: ["manzwine"],
      partySize: 2,
      marketingConsent: true,
    });
  });

  it("reads the day from `date`, and is not fooled by `preferredDate`", () => {
    // The exact production bug: the enquiry form's field name, arriving alone.
    const posted: Record<string, unknown> = submission();
    delete posted.date;
    const parsed = bookingCheckoutSchema.safeParse({
      ...posted,
      preferredDate: "2026-08-15",
    });

    expect(parsed.success).toBe(false);
    expect(parsed.error?.flatten().fieldErrors.date).toBeDefined();
  });

  it("refuses a day that is not a real calendar day", () => {
    for (const date of ["", "late August", "2026-02-31", "15/08/2026"]) {
      expect(bookingCheckoutSchema.safeParse(submission({ date })).success).toBe(false);
    }
  });

  it("refuses a party size that is not a countable number of people", () => {
    for (const partySize of ["", "0", "-1", "two", "999"]) {
      expect(bookingCheckoutSchema.safeParse(submission({ partySize })).success).toBe(
        false,
      );
    }
  });

  it("treats an absent marketing checkbox as a no", () => {
    const posted: Record<string, unknown> = submission();
    delete posted.marketingConsent;
    const parsed = bookingCheckoutSchema.safeParse(posted);
    expect(parsed.success).toBe(true);
    expect(parsed.data?.marketingConsent).toBe(false);
  });

  it("takes a booking with no add-ons and no optional details", () => {
    const parsed = bookingCheckoutSchema.safeParse(
      submission({ addOns: undefined, phone: "", message: "" }),
    );
    expect(parsed.success).toBe(true);
    expect(parsed.data).toMatchObject({ addOns: [], phone: null, message: null });
  });
});
