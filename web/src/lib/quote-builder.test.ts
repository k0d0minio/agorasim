import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Quote, QuoteLineItem, TourRequest } from "@/db";
import { QuoteDraftConflictError, type QuoteWithPayments } from "@/lib/quotes";

/**
 * The quote builder's rules — what each button on the Orçamento card may do —
 * through the real `lib/quote-builder.ts`, with the guarded writes in
 * `lib/quotes.ts` faked at their boundary. Those writes have their own SQL
 * tests (`quote-writes.test.ts`); what is asserted here is the orchestration
 * around them: who may be quoted, the one-draft-one-live rule, the order of a
 * send, the link that goes into the mail, and a double tap sending once.
 */

/** The lead `readLead` resolves — a wedding enquiry in Portuguese. */
let lead: Partial<TourRequest> | null = null;

function makeQuery(): unknown {
  const proxy: unknown = new Proxy(
    {},
    {
      get(_target, prop) {
        if (prop === "then") {
          return (onFulfilled?: (value: unknown) => unknown) =>
            Promise.resolve(lead ? [lead] : []).then(onFulfilled);
        }
        return () => proxy;
      },
    },
  );
  return proxy;
}

vi.mock("@/db", async () => {
  const schema = await vi.importActual<typeof import("@/db/schema")>("@/db/schema");
  return { ...schema, db: { select: () => makeQuery() } };
});

const quotesMock = {
  getQuote: vi.fn(),
  listQuotesForLead: vi.fn(),
  createQuote: vi.fn(),
  updateQuoteDraft: vi.fn(),
  markQuoteSent: vi.fn(),
  supersedeSentQuotes: vi.fn(),
  discardDraft: vi.fn(),
  copyQuoteAsDraft: vi.fn(),
};

vi.mock("@/lib/quotes", async () => {
  const actual = await vi.importActual<typeof import("@/lib/quotes")>("@/lib/quotes");
  return { ...actual, ...quotesMock };
});

const recordAuditOrWarn = vi.fn();
vi.mock("@/lib/audit", () => ({ recordAuditOrWarn: (...args: unknown[]) => recordAuditOrWarn(...args) }));

/** Whether the deployment can mail — flipped by the "unconfigured" cases. */
let emailConfigured = true;
vi.mock("@/lib/email", () => ({ isEmailConfigured: () => emailConfigured }));

const sendLoggedEmail = vi.fn();
vi.mock("@/lib/message-log", () => ({
  sendLoggedEmail: (...args: unknown[]) => sendLoggedEmail(...args),
}));

const {
  createDraftForLead,
  discardQuoteDraft,
  resendQuote,
  saveDraft,
  sendQuote,
  startNewVersion,
} = await import("./quote-builder");
const { quoteTokenDigest } = await import("./quote-token");
const { TERMS_VERSION } = await import("@/content/terms");

const LEAD_ID = "bbbbbbbb-2222-4222-8222-222222222222";
const QUOTE_ID = "aaaaaaaa-1111-4111-8111-111111111111";
const OPERATOR_ID = "eeeeeeee-5555-4555-8555-555555555555";
const NOW = new Date("2026-06-01T10:00:00Z");

const LINES: QuoteLineItem[] = [
  { label: "Carro clássico com motorista, 6 horas", unitCents: 75_000, quantity: 2 },
  { label: "Deslocação Ericeira", unitCents: 12_000, quantity: 1 },
];

const INPUT = {
  eventDate: "2026-08-15",
  venue: "Quinta do Hespanhol, Mafra",
  depositPercent: 30,
  lineItems: LINES,
};

function weddingLead(overrides: Partial<TourRequest> = {}): Partial<TourRequest> {
  return {
    id: LEAD_ID,
    name: "Inês Costa",
    email: "ines@example.com",
    locale: "pt",
    kind: "wedding",
    anonymisedAt: null,
    ...overrides,
  };
}

function quote(overrides: Partial<Quote> = {}): QuoteWithPayments {
  return {
    id: QUOTE_ID,
    tourRequestId: LEAD_ID,
    createdByUserId: OPERATOR_ID,
    eventDate: "2026-08-15",
    venue: "Quinta do Hespanhol, Mafra",
    locale: "pt",
    lineItems: LINES,
    totalCents: 162_000,
    currency: "eur",
    depositPercent: 30,
    termsWindowDays: 30,
    termsVersion: null,
    acceptedTermsVersion: null,
    acceptedAt: null,
    status: "draft",
    accessTokenHash: null,
    sentAt: null,
    cancelledAt: null,
    createdAt: new Date("2026-05-01T10:00:00Z"),
    updatedAt: new Date("2026-05-01T10:00:00Z"),
    ...overrides,
    payments: [
      { kind: "deposit", amountCents: 48_600, dueDate: null },
      { kind: "balance", amountCents: 113_400, dueDate: "2026-08-01" },
    ] as QuoteWithPayments["payments"],
  } as QuoteWithPayments;
}

beforeEach(() => {
  lead = weddingLead();
  emailConfigured = true;
  for (const fn of Object.values(quotesMock)) fn.mockReset();
  recordAuditOrWarn.mockReset();
  sendLoggedEmail.mockReset();
  sendLoggedEmail.mockResolvedValue({ status: "sent", providerMessageId: "re_1" });
  quotesMock.listQuotesForLead.mockResolvedValue([]);
  quotesMock.supersedeSentQuotes.mockResolvedValue([]);
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("createDraftForLead — Criar orçamento", () => {
  it("writes the draft in the enquiry's language, priced as the sum of its lines", async () => {
    quotesMock.createQuote.mockResolvedValue(quote());

    const outcome = await createDraftForLead({ leadId: LEAD_ID, input: INPUT, actorUserId: OPERATOR_ID });

    expect(outcome.status).toBe("saved");
    expect(quotesMock.createQuote).toHaveBeenCalledWith(
      expect.objectContaining({
        tourRequestId: LEAD_ID,
        createdByUserId: OPERATOR_ID,
        locale: "pt",
        eventDate: "2026-08-15",
        // 2 × €750 + €120 — the total is never typed.
        totalCents: 162_000,
        lineItems: LINES,
        depositPercent: 30,
      }),
    );
    expect(recordAuditOrWarn).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "quote.created",
        entityType: "tour_request",
        entityId: LEAD_ID,
        actorUserId: OPERATOR_ID,
      }),
    );
  });

  it("uses the English of an enquiry made in English", async () => {
    lead = weddingLead({ locale: "en" });
    quotesMock.createQuote.mockResolvedValue(quote({ locale: "en" }));

    await createDraftForLead({ leadId: LEAD_ID, input: INPUT, actorUserId: OPERATOR_ID });

    expect(quotesMock.createQuote).toHaveBeenCalledWith(expect.objectContaining({ locale: "en" }));
  });

  it("does not quote a tour — a tour is sold", async () => {
    lead = weddingLead({ kind: "tour" });

    expect(
      await createDraftForLead({ leadId: LEAD_ID, input: INPUT, actorUserId: OPERATOR_ID }),
    ).toEqual({ status: "not-quotable" });
    expect(quotesMock.createQuote).not.toHaveBeenCalled();
  });

  it("does not quote an anonymised person", async () => {
    lead = weddingLead({ anonymisedAt: NOW });

    expect(
      await createDraftForLead({ leadId: LEAD_ID, input: INPUT, actorUserId: OPERATOR_ID }),
    ).toEqual({ status: "not-quotable" });
  });

  it.each(["draft", "sent", "deposit_paid", "paid"] as const)(
    "refuses a second quote while one is %s",
    async (status) => {
      quotesMock.listQuotesForLead.mockResolvedValue([quote({ status })]);

      expect(
        await createDraftForLead({ leadId: LEAD_ID, input: INPUT, actorUserId: OPERATOR_ID }),
      ).toEqual({ status: "already-quoted" });
      expect(quotesMock.createQuote).not.toHaveBeenCalled();
    },
  );

  it("starts again once every earlier quote is cancelled", async () => {
    quotesMock.listQuotesForLead.mockResolvedValue([quote({ status: "cancelled" })]);
    quotesMock.createQuote.mockResolvedValue(quote());

    expect(
      (await createDraftForLead({ leadId: LEAD_ID, input: INPUT, actorUserId: OPERATOR_ID })).status,
    ).toBe("saved");
  });

  it("reads the other phone's insert winning the same race as already-quoted", async () => {
    // The pre-check above passed on both phones' reads; only the database's
    // own unique index caught the second insert.
    quotesMock.createQuote.mockRejectedValue(new QuoteDraftConflictError());

    expect(
      await createDraftForLead({ leadId: LEAD_ID, input: INPUT, actorUserId: OPERATOR_ID }),
    ).toEqual({ status: "already-quoted" });
    expect(recordAuditOrWarn).not.toHaveBeenCalled();
  });

  it("refuses a quote with no lines, or lines that come to nothing", async () => {
    expect(
      await createDraftForLead({
        leadId: LEAD_ID,
        input: { ...INPUT, lineItems: [] },
        actorUserId: OPERATOR_ID,
      }),
    ).toEqual({ status: "invalid", problems: ["no-lines"] });
    expect(
      await createDraftForLead({
        leadId: LEAD_ID,
        input: { ...INPUT, lineItems: [{ label: "Oferta", unitCents: 0, quantity: 1 }] },
        actorUserId: OPERATOR_ID,
      }),
    ).toEqual({ status: "invalid", problems: ["zero-total"] });
    expect(quotesMock.createQuote).not.toHaveBeenCalled();
  });
});

describe("saveDraft — Guardar", () => {
  it("re-prices the draft from its lines", async () => {
    quotesMock.updateQuoteDraft.mockResolvedValue(quote());

    await saveDraft({ quoteId: QUOTE_ID, input: INPUT, actorUserId: OPERATOR_ID });

    expect(quotesMock.updateQuoteDraft).toHaveBeenCalledWith(
      QUOTE_ID,
      expect.objectContaining({ totalCents: 162_000, lineItems: LINES }),
    );
    expect(recordAuditOrWarn).toHaveBeenCalledWith(
      expect.objectContaining({ action: "quote.updated", entityId: LEAD_ID }),
    );
  });

  it("says so when the draft was sent from the other phone meanwhile", async () => {
    quotesMock.updateQuoteDraft.mockResolvedValue(null);

    expect(
      await saveDraft({ quoteId: QUOTE_ID, input: INPUT, actorUserId: OPERATOR_ID }),
    ).toEqual({ status: "not-editable" });
    expect(recordAuditOrWarn).not.toHaveBeenCalled();
  });
});

describe("discardQuoteDraft — Descartar rascunho", () => {
  it("discards a draft and records it on the lead", async () => {
    quotesMock.discardDraft.mockResolvedValue(quote({ status: "cancelled" }));

    expect(await discardQuoteDraft({ quoteId: QUOTE_ID, actorUserId: OPERATOR_ID })).toBe(true);
    expect(recordAuditOrWarn).toHaveBeenCalledWith(
      expect.objectContaining({ action: "quote.discarded", entityId: LEAD_ID }),
    );
  });

  it("changes nothing when there is no draft left", async () => {
    quotesMock.discardDraft.mockResolvedValue(null);

    expect(await discardQuoteDraft({ quoteId: QUOTE_ID, actorUserId: OPERATOR_ID })).toBe(false);
    expect(recordAuditOrWarn).not.toHaveBeenCalled();
  });
});

describe("startNewVersion — Nova versão", () => {
  it("copies a sent quote into a draft, leaving the sent one live", async () => {
    const sent = quote({ status: "sent", sentAt: NOW });
    quotesMock.getQuote.mockResolvedValue(sent);
    quotesMock.listQuotesForLead.mockResolvedValue([sent]);
    quotesMock.copyQuoteAsDraft.mockResolvedValue(quote({ id: "ffffffff-6666-4666-8666-666666666666" }));

    const outcome = await startNewVersion({ quoteId: QUOTE_ID, actorUserId: OPERATOR_ID });

    expect(outcome.status).toBe("saved");
    expect(quotesMock.copyQuoteAsDraft).toHaveBeenCalledWith(QUOTE_ID, OPERATOR_ID);
    // Nothing is cancelled until the copy is sent.
    expect(quotesMock.supersedeSentQuotes).not.toHaveBeenCalled();
  });

  it("refuses while a draft is already waiting", async () => {
    const sent = quote({ status: "sent", sentAt: NOW });
    quotesMock.getQuote.mockResolvedValue(sent);
    quotesMock.listQuotesForLead.mockResolvedValue([
      sent,
      quote({ id: "ffffffff-6666-4666-8666-666666666666", status: "draft" }),
    ]);

    expect(await startNewVersion({ quoteId: QUOTE_ID, actorUserId: OPERATOR_ID })).toEqual({
      status: "not-editable",
    });
    expect(quotesMock.copyQuoteAsDraft).not.toHaveBeenCalled();
  });

  it.each(["deposit_paid", "paid", "cancelled", "draft"] as const)(
    "offers no new version of a %s quote",
    async (status) => {
      const source = quote({ status });
      quotesMock.getQuote.mockResolvedValue(source);
      quotesMock.listQuotesForLead.mockResolvedValue([source]);

      expect(await startNewVersion({ quoteId: QUOTE_ID, actorUserId: OPERATOR_ID })).toEqual({
        status: "not-editable",
      });
    },
  );

  it("reads the other phone's insert winning the same race as not-editable", async () => {
    const sent = quote({ status: "sent", sentAt: NOW });
    quotesMock.getQuote.mockResolvedValue(sent);
    quotesMock.listQuotesForLead.mockResolvedValue([sent]);
    // The pre-check above passed on both phones' reads; only the database's
    // own unique index caught the second insert.
    quotesMock.copyQuoteAsDraft.mockRejectedValue(new QuoteDraftConflictError());

    expect(await startNewVersion({ quoteId: QUOTE_ID, actorUserId: OPERATOR_ID })).toEqual({
      status: "not-editable",
    });
  });
});

describe("sendQuote — Enviar orçamento", () => {
  function queueSend(overrides: Partial<Quote> = {}) {
    quotesMock.getQuote.mockResolvedValue(quote());
    quotesMock.markQuoteSent.mockImplementation(async (_id: string, options: { tokenHash: string }) =>
      quote({
        status: "sent",
        sentAt: NOW,
        termsVersion: TERMS_VERSION,
        accessTokenHash: options.tokenHash,
        ...overrides,
      }),
    );
  }

  it("sends a draft only, under today's terms and a fresh link's digest", async () => {
    queueSend();

    const outcome = await sendQuote({ quoteId: QUOTE_ID, actorUserId: OPERATOR_ID, now: NOW });

    expect(outcome.status).toBe("sent");
    const [, options] = quotesMock.markQuoteSent.mock.calls[0];
    expect(options).toMatchObject({
      termsVersion: TERMS_VERSION,
      actorUserId: OPERATOR_ID,
      from: ["draft"],
      now: NOW,
    });
    expect(options.tokenHash).toMatch(/^hmac-sha256\$/);
  });

  it("emails the couple once, logged under the quote and this send's stamp", async () => {
    queueSend();

    await sendQuote({ quoteId: QUOTE_ID, actorUserId: OPERATOR_ID, now: NOW });

    expect(sendLoggedEmail).toHaveBeenCalledTimes(1);
    const [subject, message] = sendLoggedEmail.mock.calls[0];
    expect(subject).toEqual({
      kind: "quote-sent",
      recipient: "guest",
      tourRequestId: LEAD_ID,
      quoteId: QUOTE_ID,
      quoteSentAt: NOW,
    });
    expect(message.to).toEqual(["ines@example.com"]);
    expect(message.subject).toContain("O seu orçamento Agorasim");
  });

  it("puts the link whose digest the quote now holds in the email, and nowhere else", async () => {
    queueSend();

    await sendQuote({ quoteId: QUOTE_ID, actorUserId: OPERATOR_ID, now: NOW });

    const [, options] = quotesMock.markQuoteSent.mock.calls[0];
    const [, message] = sendLoggedEmail.mock.calls[0];
    const token = /\/pt\/orcamento\/([A-Za-z0-9_-]{43})/.exec(message.text)?.[1];
    expect(token).toBeDefined();
    expect(await quoteTokenDigest(token!)).toBe(options.tokenHash);

    // The audit trail names the quote and the terms — never the credential.
    const audits = JSON.stringify(recordAuditOrWarn.mock.calls);
    expect(audits).not.toContain(token);
    expect(audits).toContain('"action":"quote.sent"');
  });

  it("replaces the lead's previous sent quote when this is a new version", async () => {
    queueSend();
    quotesMock.supersedeSentQuotes.mockResolvedValue([quote({ id: "old", status: "cancelled" })]);

    const outcome = await sendQuote({ quoteId: QUOTE_ID, actorUserId: OPERATOR_ID, now: NOW });

    expect(quotesMock.supersedeSentQuotes).toHaveBeenCalledWith(
      expect.objectContaining({ id: QUOTE_ID, tourRequestId: LEAD_ID }),
      { actorUserId: OPERATOR_ID, now: NOW },
    );
    expect(outcome).toMatchObject({ status: "sent", superseded: 1 });
  });

  it("sends nothing the second time — a double tap finds no draft", async () => {
    quotesMock.getQuote.mockResolvedValue(quote({ status: "sent", sentAt: NOW }));
    quotesMock.markQuoteSent.mockResolvedValue(null);

    expect(await sendQuote({ quoteId: QUOTE_ID, actorUserId: OPERATOR_ID })).toEqual({
      status: "not-sendable",
    });
    expect(quotesMock.supersedeSentQuotes).not.toHaveBeenCalled();
    expect(sendLoggedEmail).not.toHaveBeenCalled();
  });

  it("keeps the quote sent when the email fails, and says the email did not go", async () => {
    queueSend();
    sendLoggedEmail.mockResolvedValue({ status: "failed", reason: "failed" });

    expect(await sendQuote({ quoteId: QUOTE_ID, actorUserId: OPERATOR_ID, now: NOW })).toMatchObject({
      status: "sent",
      email: "failed",
    });
  });

  it("refuses a new version once the couple paid a deposit on the live quote", async () => {
    queueSend();
    quotesMock.listQuotesForLead.mockResolvedValue([
      quote({ id: "old", status: "deposit_paid", sentAt: NOW }),
      quote(),
    ]);

    expect(await sendQuote({ quoteId: QUOTE_ID, actorUserId: OPERATOR_ID })).toEqual({
      status: "already-paid",
    });
    expect(quotesMock.markQuoteSent).not.toHaveBeenCalled();
    expect(sendLoggedEmail).not.toHaveBeenCalled();
  });

  it("refuses, and marks nothing sent, when the deployment cannot mail", async () => {
    emailConfigured = false;
    quotesMock.getQuote.mockResolvedValue(quote());

    expect(await sendQuote({ quoteId: QUOTE_ID, actorUserId: OPERATOR_ID })).toEqual({
      status: "unconfigured",
    });
    expect(quotesMock.markQuoteSent).not.toHaveBeenCalled();
  });

  it("refuses without the link secret rather than sending an unopenable quote", async () => {
    vi.stubEnv("BOOKING_TOKEN_SECRET", "");
    quotesMock.getQuote.mockResolvedValue(quote());

    expect(await sendQuote({ quoteId: QUOTE_ID, actorUserId: OPERATOR_ID })).toEqual({
      status: "unconfigured",
    });
    expect(quotesMock.markQuoteSent).not.toHaveBeenCalled();
  });
});

describe("resendQuote — Reenviar", () => {
  const SENT_AT = new Date("2026-05-20T09:00:00Z");

  it("rotates the link of the send the screen showed, and emails it once", async () => {
    quotesMock.getQuote.mockResolvedValue(quote({ status: "sent", sentAt: SENT_AT }));
    quotesMock.markQuoteSent.mockImplementation(async (_id: string, options: { tokenHash: string }) =>
      quote({ status: "sent", sentAt: NOW, accessTokenHash: options.tokenHash }),
    );

    const outcome = await resendQuote({
      quoteId: QUOTE_ID,
      sentAt: SENT_AT,
      actorUserId: OPERATOR_ID,
      now: NOW,
    });

    expect(outcome.status).toBe("sent");
    const [, options] = quotesMock.markQuoteSent.mock.calls[0];
    expect(options).toMatchObject({ from: ["sent"], ifSentAt: SENT_AT });
    expect(options.tokenHash).toMatch(/^hmac-sha256\$/);
    // A re-send replaces nothing.
    expect(quotesMock.supersedeSentQuotes).not.toHaveBeenCalled();
    expect(sendLoggedEmail.mock.calls[0][0]).toMatchObject({ quoteId: QUOTE_ID, quoteSentAt: NOW });
    expect(recordAuditOrWarn).toHaveBeenCalledWith(
      expect.objectContaining({ action: "quote.resent", entityId: LEAD_ID }),
    );
  });

  it("keeps the working link when the deployment cannot mail", async () => {
    emailConfigured = false;
    quotesMock.getQuote.mockResolvedValue(quote({ status: "sent", sentAt: SENT_AT }));

    expect(
      await resendQuote({ quoteId: QUOTE_ID, sentAt: SENT_AT, actorUserId: OPERATOR_ID }),
    ).toEqual({ status: "unconfigured" });
    // No rotation: the couple's current link still opens.
    expect(quotesMock.markQuoteSent).not.toHaveBeenCalled();
  });

  it("does nothing when the quote was re-sent since — the second tap", async () => {
    quotesMock.getQuote.mockResolvedValue(quote({ status: "sent", sentAt: NOW }));
    quotesMock.markQuoteSent.mockResolvedValue(null);

    expect(
      await resendQuote({ quoteId: QUOTE_ID, sentAt: SENT_AT, actorUserId: OPERATOR_ID }),
    ).toEqual({ status: "not-sendable" });
    expect(sendLoggedEmail).not.toHaveBeenCalled();
  });
});
