import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Quote, QuotePayment } from "@/db";
import type { EmailMessage } from "@/lib/email";
import type { ClaimedMessage, LoggedSend, MessageSubject } from "@/lib/message-log";
import type { BalanceRecipient, QuoteWithPayments } from "@/lib/quotes";

/**
 * "Enviar pedido do restante", tested at its boundaries: the quote store
 * (`lib/quotes`), the log (`lib/message-log`), the link minting
 * (`lib/quote-token`) and the audit writer. The window itself is the real
 * `dueInstalment`, so "refused from the event day" is the rule the quote page
 * applies too.
 */

let stored: QuoteWithPayments | null = null;
let lead: BalanceRecipient | undefined;
let delivered: { subject: MessageSubject; message: EmailMessage }[] = [];
let provider: "sent" | "failed" = "sent";
let emailConfigured = true;
let tokensConfigured = true;
let minted = 0;

vi.mock("@/lib/quotes", async () => {
  const actual = await vi.importActual<typeof import("@/lib/quotes")>("@/lib/quotes");
  return {
    ...actual,
    getQuote: async () => stored,
    listBalanceRecipients: async (ids: readonly string[]) =>
      new Map(lead && ids.includes(lead.id) ? [[lead.id, lead]] : []),
    rotateQuoteLink: async (
      _id: string,
      options: { expectedDigest: string | null; digest: string },
    ) => {
      if (!stored || stored.accessTokenHash !== options.expectedDigest) return null;
      stored = { ...stored, accessTokenHash: options.digest };
      return stored;
    },
  };
});

vi.mock("@/lib/message-log", () => ({
  sendLoggedEmail: async (
    subject: MessageSubject,
    content: EmailMessage | ClaimedMessage,
  ): Promise<LoggedSend> => {
    const message = typeof content === "function" ? await content() : content;
    if (!message) return { status: "duplicate" };
    if (provider === "failed") return { status: "failed", reason: "failed" };
    delivered.push({ subject, message });
    return { status: "sent", providerMessageId: `re_${delivered.length}` };
  },
}));

vi.mock("@/lib/email", () => ({ isEmailConfigured: () => emailConfigured }));

vi.mock("@/lib/quote-token", async () => {
  const actual = await vi.importActual<typeof import("@/lib/quote-token")>("@/lib/quote-token");
  return {
    ...actual,
    isQuoteTokenConfigured: () => tokensConfigured,
    issueQuoteToken: async () => {
      minted += 1;
      return { token: `token-${minted}`, digest: `digest-${minted}` };
    },
  };
});

const recordAuditOrWarn = vi.fn();
vi.mock("@/lib/audit", () => ({
  recordAuditOrWarn: (...args: unknown[]) => recordAuditOrWarn(...args),
}));

const { sendBalanceRequestNow } = await import("./balance-request");

/** The event: Saturday 15 August 2026. The balance falls due on the 14th. */
const EVENT = "2026-08-15";
const QUOTE_ID = "00000001-0000-4000-8000-000000000000";
/** 10:00 in Lisbon on a day `daysBefore` the event. */
const at = (daysBefore: number) =>
  new Date(Date.parse(`${EVENT}T09:00:00Z`) - daysBefore * 86_400_000);

function seed(
  overrides: { quote?: Partial<Quote>; balance?: Partial<QuotePayment> | null } = {},
): void {
  const payment = (fields: Partial<QuotePayment>) =>
    ({ quoteId: QUOTE_ID, currency: "eur", ...fields }) as QuotePayment;
  const payments = [
    payment({ id: "pay-deposit", kind: "deposit", status: "paid", amountCents: 48_600, dueDate: null }),
    ...(overrides.balance === null
      ? []
      : [
          payment({
            id: "pay-balance",
            kind: "balance",
            status: "pending",
            amountCents: 113_400,
            dueDate: "2026-08-14",
            ...overrides.balance,
          }),
        ]),
  ];
  stored = {
    id: QUOTE_ID,
    tourRequestId: "lead-1",
    status: "deposit_paid",
    eventDate: EVENT,
    venue: "Quinta do Hespanhol, Mafra",
    locale: "pt",
    currency: "eur",
    accessTokenHash: "original-digest",
    ...overrides.quote,
    payments,
  } as QuoteWithPayments;
}

const send = (now: Date) => sendBalanceRequestNow({ quoteId: QUOTE_ID, actorUserId: "admin-1", now });

beforeEach(() => {
  stored = null;
  lead = { id: "lead-1", name: "Inês & Tomás", email: "ines@example.com", anonymisedAt: null };
  delivered = [];
  provider = "sent";
  emailConfigured = true;
  tokensConfigured = true;
  minted = 0;
  recordAuditOrWarn.mockReset();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("sendBalanceRequestNow", () => {
  it("sends the request now with a new link, keyed on the send, and audits it", async () => {
    seed();
    const now = at(30);

    expect(await send(now)).toEqual({ status: "sent", sentAt: now });

    const [{ subject, message }] = delivered;
    expect(subject).toEqual({
      kind: "balance-request-manual",
      recipient: "guest",
      tourRequestId: "lead-1",
      quoteId: QUOTE_ID,
      quoteSentAt: now,
    });
    expect(message.to).toEqual(["ines@example.com"]);
    expect(message.subject).toContain("O restante do seu evento");
    expect(message.text).toContain("/pt/orcamento/token-1");
    expect(message.text).toContain("Pagar até:");
    expect(stored?.accessTokenHash).toBe("digest-1");
    expect(recordAuditOrWarn).toHaveBeenCalledWith(
      expect.objectContaining({ action: "quote.balance_requested", entityId: "lead-1" }),
    );
  });

  it("sends again on a second tap, each time with a new link", async () => {
    seed();

    await send(at(30));
    await send(at(20));

    expect(delivered.map(({ subject }) => subject.kind)).toEqual([
      "balance-request-manual",
      "balance-request-manual",
    ]);
    expect(stored?.accessTokenHash).toBe("digest-2");
  });

  it("sends up to the due date, the day before the event, and refuses from the event day", async () => {
    seed();
    expect((await send(at(1))).status).toBe("sent");
    expect(await send(at(0))).toEqual({ status: "closed" });
    expect(await send(at(-2))).toEqual({ status: "closed" });
    expect(delivered).toHaveLength(1);
  });

  it("refuses a quote whose deposit is not paid, or whose balance is settled", async () => {
    seed({ quote: { status: "sent" } });
    expect(await send(at(30))).toEqual({ status: "not-open" });
    seed({ quote: { status: "paid" }, balance: { status: "paid" } });
    expect(await send(at(30))).toEqual({ status: "not-open" });
    seed({ balance: { status: "cancelled" } });
    expect(await send(at(30))).toEqual({ status: "not-open" });
    seed({ balance: null });
    expect(await send(at(30))).toEqual({ status: "not-open" });
    expect(minted).toBe(0);
  });

  it("refuses with nobody to write to, and keeps the link", async () => {
    seed();
    lead = { id: "lead-1", name: "Inês", email: "", anonymisedAt: null };
    expect(await send(at(30))).toEqual({ status: "no-recipient" });
    lead = undefined;
    expect(await send(at(30))).toEqual({ status: "no-recipient" });
    expect(stored?.accessTokenHash).toBe("original-digest");
  });

  it("does nothing where mail or quote links are not configured", async () => {
    seed();
    emailConfigured = false;
    expect(await send(at(30))).toEqual({ status: "unconfigured" });
    emailConfigured = true;
    tokensConfigured = false;
    expect(await send(at(30))).toEqual({ status: "unconfigured" });
    expect(minted).toBe(0);
  });

  it("says when the provider refused, and audits nothing", async () => {
    seed();
    provider = "failed";
    expect(await send(at(30))).toEqual({ status: "failed" });
    expect(recordAuditOrWarn).not.toHaveBeenCalled();
  });

  it("finds no quote by an unknown id", async () => {
    expect(await send(at(30))).toEqual({ status: "not-found" });
  });
});
