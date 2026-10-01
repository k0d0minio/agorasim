import { describe, expect, it } from "vitest";

import type { QuoteBalanceMessage } from "@/lib/message-log";

/**
 * The balance's calendar, asserted from the spec's windows rather than from
 * the implementation: T−14 asks (never on or after the event day), T−7 chases once if
 * the request reached the couple three days before, T−3 flags for the team.
 * Every day is a Lisbon calendar key, so the tests pin "today" and never read
 * the clock.
 */
const {
  balanceMessageSentAt,
  balanceMessagesLabel,
  daysBetween,
  eventWhenLabel,
  holdsBalanceClaim,
  isBalanceFlagged,
  isReminderDue,
  isRequestInWindow,
} = await import("./balance-schedule");

const EVENT = "2026-08-15";

/** A Date in the middle of a Lisbon day — noon UTC is 13:00 there in summer. */
const at = (key: string) => new Date(`${key}T12:00:00Z`);

describe("daysBetween", () => {
  it("counts calendar days, negative once the day has passed", () => {
    expect(daysBetween("2026-08-01", EVENT)).toBe(14);
    expect(daysBetween(EVENT, EVENT)).toBe(0);
    expect(daysBetween("2026-08-16", EVENT)).toBe(-1);
  });

  it("is not moved by the October clock change", () => {
    expect(daysBetween("2026-10-20", "2026-11-03")).toBe(14);
  });
});

describe("isRequestInWindow", () => {
  it("asks up to the day before the event", () => {
    expect(isRequestInWindow(EVENT, "2026-08-01")).toBe(true);
    expect(isRequestInWindow(EVENT, "2026-08-14")).toBe(true);
  });

  it("never asks on the event day, nor after it", () => {
    expect(isRequestInWindow(EVENT, EVENT)).toBe(false);
    expect(isRequestInWindow(EVENT, "2026-08-16")).toBe(false);
  });
});

describe("isReminderDue", () => {
  it("chases at T−7 when the request went out at T−14", () => {
    expect(
      isReminderDue({ eventDate: EVENT, today: "2026-08-08", requestSentAt: at("2026-08-01") }),
    ).toBe(true);
  });

  it("does not chase before T−7", () => {
    expect(
      isReminderDue({ eventDate: EVENT, today: "2026-08-07", requestSentAt: at("2026-08-01") }),
    ).toBe(false);
  });

  it("waits three days after a late request — a deposit paid inside T−14", () => {
    // Request on T−9; the reminder is due from T−6, not at T−7 or T−8.
    const requestSentAt = at("2026-08-06");
    expect(isReminderDue({ eventDate: EVENT, today: "2026-08-08", requestSentAt })).toBe(false);
    expect(isReminderDue({ eventDate: EVENT, today: "2026-08-09", requestSentAt })).toBe(true);
  });

  it("never chases when no request reached the couple", () => {
    expect(isReminderDue({ eventDate: EVENT, today: "2026-08-10", requestSentAt: null })).toBe(
      false,
    );
  });

  it("chases as late as the day before the event", () => {
    // Request on T−4 (a deposit paid at T−5); three days later is T−1.
    expect(
      isReminderDue({ eventDate: EVENT, today: "2026-08-14", requestSentAt: at("2026-08-11") }),
    ).toBe(true);
  });

  it("never chases on the event day", () => {
    // Request on T−3: three days later is the event morning itself.
    expect(
      isReminderDue({ eventDate: EVENT, today: EVENT, requestSentAt: at("2026-08-12") }),
    ).toBe(false);
  });

  it("never chases after the event", () => {
    expect(
      isReminderDue({ eventDate: EVENT, today: "2026-08-16", requestSentAt: at("2026-08-01") }),
    ).toBe(false);
  });

  it("reads the request's day in Lisbon, not in UTC", () => {
    // 23:30 UTC on the 5th is already the 6th in Lisbon (WEST), so three
    // days later is the 9th, not the 8th.
    const requestSentAt = new Date("2026-08-05T23:30:00Z");
    expect(isReminderDue({ eventDate: EVENT, today: "2026-08-08", requestSentAt })).toBe(false);
    expect(isReminderDue({ eventDate: EVENT, today: "2026-08-09", requestSentAt })).toBe(true);
  });
});

describe("isBalanceFlagged", () => {
  type BalanceOverride = {
    status: "pending" | "issued" | "paid" | "cancelled" | "refunded";
    amountCents?: number;
  };
  const quote = (
    overrides: {
      status?: "sent" | "deposit_paid" | "paid" | "cancelled";
      eventDate?: string;
      balance?: BalanceOverride | null;
    } = {},
  ) => {
    const balance: BalanceOverride | null =
      overrides.balance === undefined ? { status: "pending" } : overrides.balance;
    return {
      status: overrides.status ?? ("deposit_paid" as const),
      eventDate: overrides.eventDate ?? EVENT,
      payments: [
        { kind: "deposit" as const, status: "paid" as const, amountCents: 48_600 },
        ...(balance
          ? [{ kind: "balance" as const, status: balance.status, amountCents: balance.amountCents ?? 113_400 }]
          : []),
      ],
    };
  };

  it("flags from T−3, not at T−4", () => {
    expect(isBalanceFlagged(quote(), "2026-08-11")).toBe(false);
    expect(isBalanceFlagged(quote(), "2026-08-12")).toBe(true);
  });

  it("keeps flagging after the event while the balance is still open", () => {
    expect(isBalanceFlagged(quote(), "2026-08-20")).toBe(true);
  });

  it("flags an issued balance — a couple who opened Checkout and left", () => {
    expect(isBalanceFlagged(quote({ balance: { status: "issued" } }), EVENT)).toBe(true);
  });

  it("clears once the balance is paid or written off", () => {
    expect(isBalanceFlagged(quote({ balance: { status: "paid" } }), EVENT)).toBe(false);
    expect(isBalanceFlagged(quote({ balance: { status: "cancelled" } }), EVENT)).toBe(false);
  });

  it("never flags a quote that is not deposit-paid, or has no balance to collect", () => {
    expect(isBalanceFlagged(quote({ status: "sent" }), EVENT)).toBe(false);
    expect(isBalanceFlagged(quote({ status: "cancelled" }), EVENT)).toBe(false);
    expect(isBalanceFlagged(quote({ balance: null }), EVENT)).toBe(false);
    expect(isBalanceFlagged(quote({ balance: { status: "pending", amountCents: 0 } }), EVENT)).toBe(
      false,
    );
  });
});

describe("the log, read back", () => {
  const sent = (kind: QuoteBalanceMessage["kind"], day: string): QuoteBalanceMessage => ({
    kind,
    status: "sent",
    sentAt: at(day),
  });

  it("counts a sending or sent row as a held claim, and a failed one not", () => {
    expect(holdsBalanceClaim([sent("balance-request", "2026-08-01")], "balance-request")).toBe(true);
    expect(
      holdsBalanceClaim([{ kind: "balance-request", status: "sending", sentAt: null }], "balance-request"),
    ).toBe(true);
    expect(
      holdsBalanceClaim([{ kind: "balance-request", status: "failed", sentAt: null }], "balance-request"),
    ).toBe(false);
    expect(holdsBalanceClaim([sent("balance-request", "2026-08-01")], "balance-reminder")).toBe(
      false,
    );
    expect(holdsBalanceClaim(undefined, "balance-request")).toBe(false);
  });

  it("reads when a kind reached the couple, ignoring rows that never did", () => {
    expect(
      balanceMessageSentAt(
        [
          { kind: "balance-request", status: "failed", sentAt: null },
          sent("balance-request", "2026-08-02"),
        ],
        "balance-request",
      ),
    ).toEqual(at("2026-08-02"));
    expect(balanceMessageSentAt([], "balance-request")).toBeNull();
  });

  it("says what went out, the reminder before the request", () => {
    expect(balanceMessagesLabel(undefined)).toBe("Pedido não enviado");
    expect(balanceMessagesLabel([sent("balance-request", "2026-08-01")])).toMatch(
      /^Pedido enviado a /,
    );
    expect(
      balanceMessagesLabel([sent("balance-request", "2026-08-01"), sent("balance-reminder", "2026-08-08")]),
    ).toMatch(/^Lembrete enviado a /);
  });
});

describe("eventWhenLabel", () => {
  it("says how far off the event is, in the team's words", () => {
    expect(eventWhenLabel(EVENT, EVENT)).toBe("Hoje");
    expect(eventWhenLabel(EVENT, "2026-08-14")).toBe("Amanhã");
    expect(eventWhenLabel(EVENT, "2026-08-12")).toBe("Daqui a 3 dias");
    expect(eventWhenLabel(EVENT, "2026-08-16")).toBe("Ontem");
    expect(eventWhenLabel(EVENT, "2026-08-18")).toBe("Há 3 dias");
  });
});
