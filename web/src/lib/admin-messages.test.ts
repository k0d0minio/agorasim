import { describe, expect, it } from "vitest";

import { messageKindEnum } from "@/db/schema";

import {
  MESSAGE_CARDS,
  STUCK_AFTER_MS,
  groupByLisbonDay,
  lisbonDayKey,
  lisbonTime,
  messageBadge,
  messageBadgeMeta,
  messageKindLabel,
  messageRecipientLabel,
  needsAttention,
  sentCountsByKind,
  type MessageRowCore,
} from "./admin-messages";

/**
 * Written from the spec's acceptance criteria (notifications-page-real), not
 * from the implementation: the Lisbon-day grouping, the badge mapping and its
 * one-hour threshold, the per-kind counts, and a label for every kind.
 */

const NOW = new Date("2026-09-25T12:00:00Z");

function row(overrides: Partial<MessageRowCore> = {}): MessageRowCore {
  return {
    kind: "booking-confirmation",
    recipient: "guest",
    status: "sent",
    sentAt: new Date("2026-09-25T09:00:00Z"),
    createdAt: new Date("2026-09-25T09:00:00Z"),
    ...overrides,
  };
}

describe("messageKindLabel", () => {
  it("names every kind the database can hold", () => {
    for (const kind of messageKindEnum.enumValues) {
      expect(messageKindLabel[kind], kind).toBeTruthy();
    }
    expect(Object.keys(messageKindLabel).sort()).toEqual([...messageKindEnum.enumValues].sort());
  });

  it("is Portuguese, with no SMS anywhere", () => {
    const words = Object.values(messageKindLabel).join(" ");
    expect(words).not.toMatch(/SMS/i);
    expect(words).not.toMatch(/\b(reminder|booking|quote|thank)\b/i);
  });
});

describe("MESSAGE_CARDS", () => {
  it("has one card for each of the twelve kinds with a sender, the balance kinds included", () => {
    const kinds = MESSAGE_CARDS.map((card) => card.kind);
    expect(kinds).toHaveLength(12);
    expect(new Set(kinds).size).toBe(12);
    expect(kinds).toContain("balance-request");
    expect(kinds).toContain("balance-reminder");
  });

  it("says when and to whom for every card, without SMS or an exclamation mark", () => {
    for (const card of MESSAGE_CARDS) {
      expect(card.when, card.kind).toMatch(/ao cliente|à equipa/);
      expect(card.when).not.toMatch(/SMS|!/);
    }
  });
});

describe("messageBadge", () => {
  it("maps sent and failed straight through", () => {
    expect(messageBadge(row({ status: "sent" }), NOW)).toBe("sent");
    expect(messageBadge(row({ status: "failed", sentAt: null }), NOW)).toBe("failed");
  });

  it("keeps a recent sending row as in flight", () => {
    const createdAt = new Date(NOW.getTime() - 5 * 60 * 1000);
    expect(messageBadge(row({ status: "sending", sentAt: null, createdAt }), NOW)).toBe("sending");
  });

  it("marks a sending row older than one hour as unconfirmed, and one exactly at the hour as still sending", () => {
    const atTheHour = new Date(NOW.getTime() - STUCK_AFTER_MS);
    const pastTheHour = new Date(NOW.getTime() - STUCK_AFTER_MS - 1000);
    expect(messageBadge(row({ status: "sending", sentAt: null, createdAt: atTheHour }), NOW)).toBe(
      "sending",
    );
    expect(
      messageBadge(row({ status: "sending", sentAt: null, createdAt: pastTheHour }), NOW),
    ).toBe("unconfirmed");
    expect(STUCK_AFTER_MS).toBe(60 * 60 * 1000);
  });

  it("labels every badge in Portuguese", () => {
    expect(messageBadgeMeta.sent.label).toBe("Enviada");
    expect(messageBadgeMeta.failed.label).toBe("Falhou");
    expect(messageBadgeMeta.sending.label).toBe("A enviar");
    expect(messageBadgeMeta.unconfirmed.label).toBe("Por confirmar");
  });
});

describe("needsAttention", () => {
  it("holds failed sends and stuck sends, nothing else", () => {
    const stuck = new Date(NOW.getTime() - 2 * STUCK_AFTER_MS);
    const fresh = new Date(NOW.getTime() - 60 * 1000);
    expect(needsAttention(row({ status: "failed", sentAt: null }), NOW)).toBe(true);
    expect(needsAttention(row({ status: "sending", sentAt: null, createdAt: stuck }), NOW)).toBe(
      true,
    );
    expect(needsAttention(row({ status: "sending", sentAt: null, createdAt: fresh }), NOW)).toBe(
      false,
    );
    expect(needsAttention(row({ status: "sent" }), NOW)).toBe(false);
  });
});

describe("Lisbon days", () => {
  it("puts a send at 23:30 UTC in summer on the next Lisbon day", () => {
    const lateEvening = new Date("2026-09-24T23:30:00Z");
    expect(lisbonDayKey(lateEvening)).toBe("2026-09-25");
    expect(lisbonTime(lateEvening)).toBe("00:30");
  });

  it("keeps 23:30 UTC in winter on the same day, Lisbon being on UTC then", () => {
    expect(lisbonDayKey(new Date("2026-12-10T23:30:00Z"))).toBe("2026-12-10");
  });

  it("groups newest day first and newest row first, whatever the input order", () => {
    const a = row({ sentAt: new Date("2026-09-23T10:00:00Z") });
    const b = row({ sentAt: new Date("2026-09-24T23:30:00Z") }); // the 25th in Lisbon
    const c = row({ sentAt: new Date("2026-09-25T08:00:00Z") });
    const d = row({ sentAt: new Date("2026-09-24T12:00:00Z") });

    const days = groupByLisbonDay([a, b, c, d]);
    expect(days.map((day) => day.key)).toEqual(["2026-09-25", "2026-09-24", "2026-09-23"]);
    expect(days[0].rows).toEqual([c, b]);
    expect(days[1].rows).toEqual([d]);
    expect(days[2].rows).toEqual([a]);
  });

  it("dates a row that never settled by its claim", () => {
    const failed = row({ status: "failed", sentAt: null, createdAt: new Date("2026-09-20T10:00:00Z") });
    expect(groupByLisbonDay([failed])[0].key).toBe("2026-09-20");
  });

  it("writes the day heading in Portuguese, sentence case", () => {
    const [day] = groupByLisbonDay([row({ sentAt: new Date("2026-09-25T09:00:00Z") })]);
    expect(day.label).toMatch(/^Sexta-feira/);
    expect(day.label).toContain("setembro");
  });

  it("is empty for no rows", () => {
    expect(groupByLisbonDay([])).toEqual([]);
  });
});

describe("sentCountsByKind", () => {
  it("counts only sent rows, per kind, with 0 for every kind nothing was sent of", () => {
    const counts = sentCountsByKind([
      row({ kind: "day-before-reminder" }),
      row({ kind: "day-before-reminder" }),
      row({ kind: "day-before-reminder", status: "failed" }),
      row({ kind: "day-before-reminder", status: "sending" }),
      row({ kind: "quote-sent" }),
    ]);
    expect(counts["day-before-reminder"]).toBe(2);
    expect(counts["quote-sent"]).toBe(1);
    expect(counts["thank-you-review"]).toBe(0);
    expect(Object.keys(counts).sort()).toEqual([...messageKindEnum.enumValues].sort());
  });
});

describe("messageRecipientLabel", () => {
  it("names the guest from the pedido, and the team as Equipa", () => {
    expect(messageRecipientLabel("guest", "Laura Bianchi")).toBe("Laura Bianchi");
    expect(messageRecipientLabel("team", "Laura Bianchi")).toBe("Equipa");
    expect(messageRecipientLabel("guest", null)).toBe("Cliente");
    expect(messageRecipientLabel("guest", "  ")).toBe("Cliente");
  });
});
