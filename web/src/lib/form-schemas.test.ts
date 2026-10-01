import { describe, expect, it } from "vitest";
import { z } from "zod";

import {
  bookingCheckoutSchema,
  formValues,
  quoteDraftSchema,
  blockDaysSchema,
  dayRosterSchema,
  quoteRequestSchema,
} from "@/lib/form-schemas";
import { DEFAULT_DRIVERS, MAX_DRIVERS, todayKey } from "@/lib/availability";
import { shiftDays } from "@/lib/quotes";

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
    slot: "morning",
    experience: "rural-saloia",
    mode: "private",
    addOns: ["manzwine"],
    adults: "2",
    children: "1",
    infants: "0",
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
      slot: "morning",
      experience: "rural-saloia",
      mode: "private",
      addOns: ["manzwine"],
      adults: 2,
      children: 1,
      infants: 0,
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

  it("refuses a party with no countable adult", () => {
    for (const adults of ["", "0", "-1", "two", "999"]) {
      expect(bookingCheckoutSchema.safeParse(submission({ adults })).success).toBe(
        false,
      );
    }
  });

  it("refuses a departure that is not one the business runs", () => {
    for (const slot of ["", "full_day", "evening"]) {
      expect(bookingCheckoutSchema.safeParse(submission({ slot })).success).toBe(false);
    }
  });

  it("refuses a mode that is not public or private", () => {
    expect(bookingCheckoutSchema.safeParse(submission({ mode: "vip" })).success).toBe(
      false,
    );
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

/**
 * The calendar's two write schemas.
 *
 * Same class of bug as the one above, in the other direction: these fields
 * only meet the form at runtime. A stretch that silently parsed to nothing
 * would read on screen as "blocked the week" and change not one row.
 */
describe("blockDaysSchema", () => {
  it("takes a single day — `from` alone", () => {
    const parsed = blockDaysSchema.safeParse({ from: "2026-08-15", block: "day" });
    expect(parsed.success).toBe(true);
    expect(parsed.data).toMatchObject({ from: "2026-08-15", block: "day" });
    expect(parsed.data?.to).toBeUndefined();
  });

  it("takes a stretch across months — two ends", () => {
    const parsed = blockDaysSchema.safeParse({
      from: "2026-12-28",
      to: "2027-01-03",
      block: "morning",
    });
    expect(parsed.success).toBe(true);
    expect(parsed.data).toMatchObject({ from: "2026-12-28", to: "2027-01-03" });
  });

  it("knows the four buttons and nothing else", () => {
    for (const block of ["day", "morning", "afternoon", "none"]) {
      expect(blockDaysSchema.safeParse({ from: "2026-08-15", block }).success).toBe(true);
    }
    expect(blockDaysSchema.safeParse({ from: "2026-08-15", block: "open" }).success).toBe(
      false,
    );
  });

  it("turns an end that is not a day into no end rather than refusing", () => {
    const parsed = blockDaysSchema.safeParse({ from: "whenever", to: "2026-02-31", block: "day" });
    expect(parsed.success).toBe(true);
    expect(parsed.data?.from).toBeUndefined();
    expect(parsed.data?.to).toBeUndefined();
  });

  /**
   * Blocking keeps a day's roster and note (spec criterion 5): the schema has
   * no field for either, so a crafted form cannot smuggle one into a block.
   */
  it("carries no roster and no note, whatever the form posts", () => {
    const parsed = blockDaysSchema.parse({
      from: "2026-08-15",
      block: "day",
      drivers: "1",
      note: "Casamento",
    });
    expect(parsed).not.toHaveProperty("drivers");
    expect(parsed).not.toHaveProperty("note");
  });
});

describe("dayRosterSchema", () => {
  const roster = (overrides: Record<string, unknown> = {}) => ({
    date: "2026-08-15",
    drivers: String(DEFAULT_DRIVERS),
    note: "",
    ...overrides,
  });

  it("clamps the roster to the drivers that exist", () => {
    // A third driver is AGORA-019's question, not this form's — a crafted
    // request gets the nearest legal number, not a person who does not exist.
    expect(dayRosterSchema.parse(roster({ drivers: "9" })).drivers).toBe(MAX_DRIVERS);
    expect(dayRosterSchema.parse(roster({ drivers: "0" })).drivers).toBe(1);
    expect(dayRosterSchema.parse(roster({ drivers: "two" })).drivers).toBe(DEFAULT_DRIVERS);
  });

  it("clears the note when the panel posts an empty one", () => {
    expect(dayRosterSchema.parse(roster({ note: "  " })).note).toBeNull();
  });

  it("keeps a note the panel did post", () => {
    expect(dayRosterSchema.parse(roster({ note: "  Casamento  " })).note).toBe("Casamento");
  });

  /** Saving "Mais opções" never changes whether a departure is blocked. */
  it("carries no status, whatever the form posts", () => {
    expect(dayRosterSchema.parse(roster({ status: "closed" }))).not.toHaveProperty("status");
  });
});

/**
 * The wedding and event quote form.
 *
 * Its field names are pinned here for the reason the checkout's are, one file
 * up: a form field is a string on one side and a schema key on the other, and
 * nothing type-checks the join. The rest of these are about the promise the
 * form makes — that a couple who have not booked a church yet can still send
 * it. Every field but the name and the e-mail has to survive being left empty.
 */

/** What `/casamentos` posts when every box is filled in. */
function quote(overrides: Record<string, unknown> = {}) {
  return {
    kind: "wedding",
    name: "Sofia & Miguel",
    email: "sofia@example.com",
    phone: "+351912345678",
    preferredDate: "2027-06-12",
    venue: "Igreja de São Pedro, Mafra",
    serviceHours: "full-day",
    preferredCar: "citroen-2cv",
    partySize: "80",
    message: "Queremos chegar de 2CV.",
    marketingConsent: "on",
    ...overrides,
  };
}

describe("quoteRequestSchema", () => {
  it("accepts what the quote form posts, under the names it posts them", () => {
    const parsed = quoteRequestSchema.safeParse(quote());
    expect(parsed.success).toBe(true);
    expect(parsed.data).toEqual({
      kind: "wedding",
      name: "Sofia & Miguel",
      email: "sofia@example.com",
      phone: "+351912345678",
      preferredDate: "2027-06-12",
      venue: "Igreja de São Pedro, Mafra",
      serviceHours: "full-day",
      preferredCar: "citroen-2cv",
      partySize: 80,
      message: "Queremos chegar de 2CV.",
      marketingConsent: true,
    });
  });

  it("takes an enquiry that knows nothing but a name and an e-mail", () => {
    const parsed = quoteRequestSchema.safeParse({
      kind: "event",
      name: "Marta",
      email: "marta@example.com",
    });
    expect(parsed.success).toBe(true);
    expect(parsed.data).toMatchObject({
      kind: "event",
      venue: null,
      preferredDate: null,
      serviceHours: null,
      preferredCar: null,
      partySize: null,
      message: null,
      // Absence is the "no" — never inferred from the rest of the form.
      marketingConsent: false,
    });
  });

  it("refuses only the two fields a reply needs", () => {
    const parsed = quoteRequestSchema.safeParse(quote({ name: "  ", email: "sofia@" }));
    expect(parsed.success).toBe(false);
    if (parsed.success) return;
    expect(Object.keys(z.flattenError(parsed.error).fieldErrors).sort()).toEqual([
      "email",
      "name",
    ]);
  });

  it("drops a service-hours option and a car this build does not offer", () => {
    const parsed = quoteRequestSchema.safeParse(
      quote({ serviceHours: "fortnight", preferredCar: "delorean" }),
    );
    // Dropped, never rejected: a stale tab is still a lead worth having.
    expect(parsed.success).toBe(true);
    expect(parsed.data).toMatchObject({ serviceHours: null, preferredCar: null });
  });

  it("files a forged or missing kind as an event rather than losing the lead", () => {
    const parsed = quoteRequestSchema.safeParse(quote({ kind: "tour" }));
    expect(parsed.success).toBe(true);
    expect(parsed.data?.kind).toBe("event");
  });

  it("keeps a party size only when it is a real count", () => {
    for (const value of ["0", "-3", "algumas", ""]) {
      expect(quoteRequestSchema.safeParse(quote({ partySize: value })).data?.partySize).toBe(
        null,
      );
    }
  });
});

describe("quoteDraftSchema", () => {
  const LEAD = "bbbbbbbb-2222-4222-8222-222222222222";

  /** Far enough out that it is never "in the past" for the schema's check. */
  const FUTURE_EVENT_DATE = "2099-08-15";

  /** The builder's form as `FormData`, repeated line fields in row order. */
  function form(lines: [string, string, string][], extra: Record<string, string> = {}) {
    const data = new FormData();
    data.set("leadId", LEAD);
    data.set("eventDate", FUTURE_EVENT_DATE);
    data.set("venue", "Quinta do Hespanhol, Mafra");
    data.set("depositPercent", "30");
    for (const [label, quantity, unit] of lines) {
      data.append("lineLabel", label);
      data.append("lineQuantity", quantity);
      data.append("lineUnit", unit);
    }
    for (const [key, value] of Object.entries(extra)) data.set(key, value);
    return formValues(data);
  }

  it("parses the lines into cents, skipping the empty row the form always offers", () => {
    const parsed = quoteDraftSchema.parse(
      form([
        ["Carro clássico com motorista", "2", "750"],
        ["Deslocação Ericeira", "1", "120,50"],
        ["", "1", ""],
      ]),
    );

    expect(parsed.lineItems).toEqual([
      { label: "Carro clássico com motorista", unitCents: 75_000, quantity: 2 },
      { label: "Deslocação Ericeira", unitCents: 12_050, quantity: 1 },
    ]);
    expect(parsed).toMatchObject({ leadId: LEAD, quoteId: null, depositPercent: 30 });
  });

  it("names the row that is incomplete", () => {
    const result = quoteDraftSchema.safeParse(
      form([
        ["Carro", "1", "750"],
        ["", "1", "120"],
      ]),
    );

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe("A linha 2 precisa de uma descrição.");
  });

  it("refuses a price written with a thousands separator rather than misread it", () => {
    // "1.500" is €1,500 to Rita and would be €1.50 to parseAmountInput.
    const result = quoteDraftSchema.safeParse(form([["Carro clássico, 6 horas", "1", "1.500"]]));

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toContain("sem separador de milhares");
    expect(
      quoteDraftSchema.parse(form([["Carro clássico, 6 horas", "1", "1500,50"]])).lineItems[0]
        ?.unitCents,
    ).toBe(150_050);
  });

  it("refuses a quote with no lines", () => {
    const result = quoteDraftSchema.safeParse(form([["", "1", ""]]));

    expect(result.error?.issues[0]?.message).toBe("Acrescente pelo menos uma linha ao orçamento.");
  });

  it("refuses a missing event day and a deposit outside 1–100", () => {
    expect(
      quoteDraftSchema.safeParse(form([["Carro", "1", "750"]], { eventDate: "" })).success,
    ).toBe(false);
    expect(
      quoteDraftSchema.safeParse(form([["Carro", "1", "750"]], { depositPercent: "0" })).success,
    ).toBe(false);
    expect(
      quoteDraftSchema.safeParse(form([["Carro", "1", "750"]], { depositPercent: "30.5" })).success,
    ).toBe(false);
  });

  it("refuses an event date that has already happened", () => {
    const yesterday = shiftDays(todayKey(), -1);
    const result = quoteDraftSchema.safeParse(
      form([["Carro", "1", "750"]], { eventDate: yesterday }),
    );

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe("A data do evento já passou.");
  });

  it("accepts today, and a date inside the T-14 balance window", () => {
    expect(
      quoteDraftSchema.safeParse(form([["Carro", "1", "750"]], { eventDate: todayKey() })).success,
    ).toBe(true);
    expect(
      quoteDraftSchema.safeParse(
        form([["Carro", "1", "750"]], { eventDate: shiftDays(todayKey(), 7) }),
      ).success,
    ).toBe(true);
  });
});
