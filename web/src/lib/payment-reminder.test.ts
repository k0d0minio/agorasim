import { describe, expect, it } from "vitest";

import { bookingEmails } from "@/content/emails";

import {
  canRemind,
  formatReminderTime,
  reminderVerdict,
  type ReminderBooking,
} from "./payment-reminder";

/**
 * "Lembrar" (JAM-292), from the spec's acceptance criteria: which booking has
 * the button, how the card says when the last reminder went, and that the
 * reminder's own text exists in both languages.
 */

const NOW = new Date("2026-11-12T14:00:00Z");
const LAPSED = new Date("2026-11-12T13:00:00Z");
const LIVE = new Date("2026-11-12T14:10:00Z");

function booking(overrides: Partial<ReminderBooking> = {}): ReminderBooking {
  return {
    status: "expired",
    holdExpiresAt: LAPSED,
    paymentLinkTokenHash: null,
    date: "2026-11-28",
    ...overrides,
  };
}

describe("reminderVerdict", () => {
  it("accepts an unpaid site checkout: expired, or pending with a lapsed hold", () => {
    expect(reminderVerdict(booking(), { reminded: false, now: NOW })).toEqual({ ok: true });
    expect(
      reminderVerdict(booking({ status: "pending" }), { reminded: false, now: NOW }),
    ).toEqual({ ok: true });
  });

  it("accepts a departure that is today", () => {
    expect(canRemind(booking({ date: "2026-11-12" }), { reminded: false, now: NOW })).toBe(true);
  });

  it("accepts an expired checkout whose hold still had minutes to run", () => {
    // The guest tapped "back": the row is expired before its hold lapsed.
    expect(canRemind(booking({ holdExpiresAt: LIVE }), { reminded: false, now: NOW })).toBe(true);
  });

  it("refuses a paid or refunded booking", () => {
    for (const status of ["confirmed", "refunded"] as const) {
      expect(reminderVerdict(booking({ status }), { reminded: false, now: NOW })).toEqual({
        ok: false,
        reason: "paid",
      });
    }
  });

  it("refuses a cancelled booking", () => {
    expect(
      reminderVerdict(booking({ status: "cancelled" }), { reminded: true, now: NOW }),
    ).toEqual({ ok: false, reason: "closed" });
  });

  it("refuses a departure that is past", () => {
    expect(
      reminderVerdict(booking({ date: "2026-11-11" }), { reminded: false, now: NOW }),
    ).toEqual({ ok: false, reason: "past" });
  });

  it("refuses a guest who is on the payment form now", () => {
    expect(
      reminderVerdict(booking({ status: "pending", holdExpiresAt: LIVE }), {
        reminded: false,
        now: NOW,
      }),
    ).toEqual({ ok: false, reason: "in-checkout" });
  });

  it("tells a reminded checkout from a link the team registered", () => {
    const withLink = booking({ status: "pending", paymentLinkTokenHash: "hmac-sha256$x" });
    expect(reminderVerdict(withLink, { reminded: false, now: NOW })).toEqual({
      ok: false,
      reason: "team-link",
    });
    expect(reminderVerdict(withLink, { reminded: true, now: NOW })).toEqual({ ok: true });
  });
});

describe("formatReminderTime", () => {
  it("says the day and the time as the card does: 12/11 14:05", () => {
    expect(formatReminderTime(new Date("2026-11-12T14:05:00Z"))).toBe("12/11 14:05");
  });

  it("is Lisbon time, in summer too", () => {
    expect(formatReminderTime(new Date("2026-07-01T13:05:00Z"))).toBe("01/07 14:05");
    expect(formatReminderTime(new Date("2026-07-01T23:30:00Z"))).toBe("02/07 00:30");
  });
});

describe("the reminder email's text", () => {
  it("exists in pt and en for every line", () => {
    for (const [key, line] of Object.entries(bookingEmails.paymentReminder)) {
      expect(line.pt.trim(), `${key}.pt`).not.toBe("");
      expect(line.en.trim(), `${key}.en`).not.toBe("");
      expect(line.pt, key).not.toBe(line.en);
    }
  });

  it("only replaces lines the payment link email has, so no line is left unused", () => {
    for (const key of Object.keys(bookingEmails.paymentReminder)) {
      expect(Object.keys(bookingEmails.paymentLink)).toContain(key);
    }
  });

  it("does not thank the guest for a contact they never made", () => {
    expect(bookingEmails.paymentReminder.lead.pt).not.toMatch(/Obrigado pelo contacto/);
    expect(bookingEmails.paymentReminder.footerNote.pt).toMatch(/começou uma reserva/);
    expect(bookingEmails.paymentReminder.footerNote.en).toMatch(/started a booking/);
  });
});
