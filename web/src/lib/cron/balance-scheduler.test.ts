import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Quote, QuotePayment } from "@/db";
import type { EmailMessage } from "@/lib/email";
import type {
  ClaimedMessage,
  LoggedSend,
  MessageSubject,
  QuoteBalanceMessage,
} from "@/lib/message-log";
import type { BalanceRecipient } from "@/lib/quotes";

/**
 * The balance job, tested at its boundaries: the quotes (`lib/quotes`), the
 * log that claims each send (`lib/message-log`), and the link minting
 * (`lib/quote-token`).
 *
 * The fake log keys a claim as `message_log_quote_receipt_key` does — kind,
 * recipient, quote — builds a {@link ClaimedMessage} only for the winner, and
 * gives the claim back when the builder stands down or the provider refuses.
 * The fake quote store answers the two queries with the spec's windows and
 * swaps a quote's digest only when the caller names the one in place — the
 * compare-and-swap `rotateQuoteLink` is. So "a rerun sends nothing and keeps
 * the link", "the link mailed is the one stored" and "a racing run stands
 * down" are answered here the way the database would answer them.
 */

type Row = { quote: Quote; payment: QuotePayment };

/** The quotes, by id — their status, event, balance and current digest. */
let store = new Map<string, Row>();
let leads = new Map<string, BalanceRecipient>();

/** The log: one row per claim, as the scheduler reads it back. */
let log: (QuoteBalanceMessage & { quoteId: string })[] = [];
/** Every message that reached the provider, in order. */
let delivered: { subject: MessageSubject; message: EmailMessage }[] = [];
/** Quote ids whose next send the provider refuses. */
let failNext = new Set<string>();
/** Quote ids whose link another run changes just before this one's swap. */
let raceOn = new Set<string>();
/** Set to make the request pass's read fail — the database timed out. */
let unreadable = false;
/** The instant the fake provider stamps on a delivery. */
let clock = new Date();

let emailConfigured = true;
let tokensConfigured = true;
let minted = 0;

const DAY_MS = 86_400_000;
const shift = (key: string, days: number) =>
  new Date(Date.parse(`${key}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);
/** Lisbon's calendar day at `now` — the job's `todayKey`. */
const lisbonDay = (now: Date) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Lisbon" }).format(now);

vi.mock("@/lib/quotes", async () => {
  const actual = await vi.importActual<typeof import("@/lib/quotes")>("@/lib/quotes");
  return {
    ...actual,
    listQuotesDueForBalance: async ({ now = new Date() }: { now?: Date } = {}) => {
      if (unreadable) throw new Error("connection timeout");
      const horizon = shift(lisbonDay(now), 14);
      return [...store.values()].filter(
        ({ quote, payment }) =>
          quote.status === "deposit_paid" &&
          payment.status === "pending" &&
          payment.issuedAt === null &&
          quote.eventDate <= horizon,
      );
    },
    listQuotesForBalanceReminder: async ({ now = new Date() }: { now?: Date } = {}) => {
      const today = lisbonDay(now);
      return [...store.values()].filter(
        ({ quote, payment }) =>
          quote.status === "deposit_paid" &&
          (payment.status === "pending" || payment.status === "issued") &&
          quote.eventDate >= today &&
          quote.eventDate <= shift(today, 7),
      );
    },
    listBalanceRecipients: async (ids: readonly string[]) =>
      new Map([...leads].filter(([id]) => ids.includes(id))),
    rotateQuoteLink: async (
      id: string,
      options: { expectedDigest: string | null; digest: string },
    ) => {
      const row = store.get(id);
      if (!row) return null;
      if (raceOn.has(id)) {
        raceOn.delete(id);
        row.quote = { ...row.quote, accessTokenHash: "digest-from-another-run" };
      }
      if (row.quote.status !== "deposit_paid") return null;
      if (row.quote.accessTokenHash !== options.expectedDigest) return null;
      row.quote = { ...row.quote, accessTokenHash: options.digest };
      return row.quote;
    },
  };
});

vi.mock("@/lib/message-log", () => ({
  listQuoteBalanceMessages: async (ids: readonly string[]) => {
    const byQuote = new Map<string, QuoteBalanceMessage[]>();
    for (const row of log.filter((entry) => ids.includes(entry.quoteId))) {
      const list = byQuote.get(row.quoteId) ?? [];
      list.push({ kind: row.kind, status: row.status, sentAt: row.sentAt });
      byQuote.set(row.quoteId, list);
    }
    return byQuote;
  },
  sendLoggedEmail: async (
    subject: MessageSubject,
    content: EmailMessage | ClaimedMessage,
  ): Promise<LoggedSend> => {
    const quoteId = String(subject.quoteId);
    const kind = subject.kind as QuoteBalanceMessage["kind"];
    if (log.some((row) => row.quoteId === quoteId && row.kind === kind && row.status !== "failed")) {
      return { status: "duplicate" };
    }
    const claim = { quoteId, kind, status: "sending" as const, sentAt: null };
    log.push(claim);
    const release = () => {
      log = log.filter((row) => row !== claim);
    };

    const message = typeof content === "function" ? await content() : content;
    if (!message) {
      release();
      return { status: "duplicate" };
    }
    if (failNext.has(quoteId)) {
      failNext.delete(quoteId);
      log = log.map((row) => (row === claim ? { ...row, status: "failed" as const } : row));
      return { status: "failed", reason: "failed" };
    }
    log = log.map((row) => (row === claim ? { ...row, status: "sent" as const, sentAt: clock } : row));
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

const captureError = vi.fn();
vi.mock("@/lib/observability", () => ({
  captureError: (...args: unknown[]) => captureError(...args),
}));

const register = vi.fn();
vi.mock("@/lib/cron/jobs", () => ({ register: (...args: unknown[]) => register(...args) }));

const { balanceScheduler, BALANCE_SCHEDULER_JOB } = await import("./balance-scheduler");

/** The event every test is about: Saturday 15 August 2026. */
const EVENT = "2026-08-15";
/** 07:00 in Lisbon on the morning `daysBefore` the event — the dispatcher's run. */
const morning = (daysBefore: number) => new Date(`${shift(EVENT, -daysBefore)}T06:00:00Z`);

let serial = 0;

/** A deposit-paid quote with an open balance, and the couple behind it. */
function seedQuote(
  overrides: {
    quote?: Partial<Quote>;
    payment?: Partial<QuotePayment>;
    lead?: Partial<BalanceRecipient> | null;
  } = {},
): string {
  serial += 1;
  const id = `${String(serial).padStart(8, "0")}-0000-4000-8000-000000000000`;
  const leadId = `lead-${serial}`;
  const quote = {
    id,
    tourRequestId: leadId,
    status: "deposit_paid",
    eventDate: EVENT,
    venue: "Quinta do Hespanhol, Mafra",
    locale: "pt",
    currency: "eur",
    accessTokenHash: `original-digest-${serial}`,
    ...overrides.quote,
  } as Quote;
  const payment = {
    id: `pay-${serial}`,
    quoteId: id,
    kind: "balance",
    amountCents: 113_400,
    currency: "eur",
    dueDate: shift(EVENT, -14),
    status: "pending",
    issuedAt: null,
    ...overrides.payment,
  } as QuotePayment;
  store.set(id, { quote, payment });
  if (overrides.lead !== null) {
    leads.set(leadId, {
      id: leadId,
      name: `Couple ${serial}`,
      email: `couple${serial}@example.com`,
      anonymisedAt: null,
      ...overrides.lead,
    });
  }
  return id;
}

/** Run the dispatcher's job at `now`, stamping deliveries with that instant. */
async function runAt(now: Date) {
  clock = now;
  return balanceScheduler(now);
}

const digestOf = (id: string) => store.get(id)!.quote.accessTokenHash;
const sentKinds = () => delivered.map(({ subject }) => `${subject.kind}:${subject.quoteId}`);
const linkIn = (message: EmailMessage) => message.text.match(/\/orcamento\/(\S+)/)?.[1];

beforeEach(() => {
  store = new Map();
  leads = new Map();
  log = [];
  delivered = [];
  failNext = new Set();
  raceOn = new Set();
  unreadable = false;
  emailConfigured = true;
  tokensConfigured = true;
  minted = 0;
  captureError.mockReset();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("the T−14 request", () => {
  it("goes out once on the T−14 morning, with a link that is the one stored", async () => {
    const id = seedQuote();

    const result = await runAt(morning(14));

    expect(result.name).toBe(BALANCE_SCHEDULER_JOB);
    expect(sentKinds()).toEqual([`balance-request:${id}`]);
    const [{ subject, message }] = delivered;
    expect(subject).toMatchObject({ recipient: "guest", tourRequestId: `lead-${serial}`, quoteId: id });
    expect(message.to).toEqual([`couple${serial}@example.com`]);
    expect(message.subject).toContain("O restante do seu evento");
    // The token in the mail is the one whose digest the quote now holds.
    expect(linkIn(message)).toBe("token-1");
    expect(digestOf(id)).toBe("digest-1");
  });

  it("sends nothing and keeps the link on a rerun that morning and on later mornings", async () => {
    const id = seedQuote();
    await runAt(morning(14));

    await runAt(morning(14));
    await runAt(morning(13));
    await runAt(morning(10));

    expect(sentKinds()).toEqual([`balance-request:${id}`]);
    expect(digestOf(id)).toBe("digest-1");
    expect(minted).toBe(1);
  });

  it("asks nothing at T−15", async () => {
    seedQuote();

    await runAt(morning(15));

    expect(delivered).toEqual([]);
  });

  it("asks the morning after a deposit paid inside T−14", async () => {
    const id = seedQuote({ quote: { eventDate: shift(EVENT, 0) } });

    await runAt(morning(10));

    expect(sentKinds()).toEqual([`balance-request:${id}`]);
  });

  it("includes a deposit paid by transfer and written off — the quote is deposit-paid either way", async () => {
    // `statusAfterPayment` moves a written-off deposit's quote to
    // `deposit_paid`; the job reads the status, not how the deposit was paid.
    const id = seedQuote();

    await runAt(morning(14));

    expect(sentKinds()).toEqual([`balance-request:${id}`]);
  });

  it("never asks once the event has passed", async () => {
    seedQuote();

    await runAt(new Date(`${shift(EVENT, 1)}T06:00:00Z`));

    expect(delivered).toEqual([]);
  });

  it("asks nothing of a sent or cancelled quote, or a balance paid or written off", async () => {
    seedQuote({ quote: { status: "sent" } });
    seedQuote({ quote: { status: "cancelled" } });
    seedQuote({ payment: { status: "paid" } });
    seedQuote({ payment: { status: "cancelled" } });

    await runAt(morning(14));

    expect(delivered).toEqual([]);
  });

  it("writes in the quote's language", async () => {
    seedQuote({ quote: { locale: "en" } });

    await runAt(morning(14));

    expect(delivered[0].message.subject).toContain("The balance for your event");
    expect(delivered[0].message.text).toContain("/en/orcamento/token-1");
  });
});

describe("the T−7 reminder", () => {
  it("chases once at T−7 with a new link, which replaces the request's", async () => {
    const id = seedQuote();
    await runAt(morning(14));

    await runAt(morning(7));
    await runAt(morning(7));
    await runAt(morning(5));

    expect(sentKinds()).toEqual([`balance-request:${id}`, `balance-reminder:${id}`]);
    expect(linkIn(delivered[1].message)).toBe("token-2");
    expect(digestOf(id)).toBe("digest-2");
    expect(delivered[1].message.subject).toMatch(/^Lembrete: /);
  });

  it("chases a couple who opened Checkout and left — the balance is issued, not paid", async () => {
    const id = seedQuote();
    await runAt(morning(14));
    store.get(id)!.payment = { ...store.get(id)!.payment, status: "issued" };

    await runAt(morning(7));

    expect(sentKinds()).toEqual([`balance-request:${id}`, `balance-reminder:${id}`]);
  });

  it("waits until three days after a late request", async () => {
    const id = seedQuote();
    await runAt(morning(9));

    await runAt(morning(8));
    await runAt(morning(7));
    expect(sentKinds()).toEqual([`balance-request:${id}`]);

    await runAt(morning(6));
    expect(sentKinds()).toEqual([`balance-request:${id}`, `balance-reminder:${id}`]);
  });

  it("does not chase a balance paid before T−7", async () => {
    const id = seedQuote();
    await runAt(morning(14));
    store.get(id)!.payment = { ...store.get(id)!.payment, status: "paid" };

    await runAt(morning(7));

    expect(sentKinds()).toEqual([`balance-request:${id}`]);
  });

  it("does not chase a request that only reached the couple on the T−7 morning", async () => {
    const id = seedQuote();
    // The provider refuses every morning from T−14 to T−8; each retries the
    // request with a fresh link, and none is a reason to remind anybody.
    for (let daysBefore = 14; daysBefore >= 8; daysBefore -= 1) {
      failNext.add(id);
      await runAt(morning(daysBefore));
    }
    expect(delivered).toEqual([]);

    await runAt(morning(7));

    expect(sentKinds()).toEqual([`balance-request:${id}`]);
  });
});

describe("the link and the claim", () => {
  it("stands down when another run changed the link first — no email, the claim given back", async () => {
    const id = seedQuote();
    raceOn.add(id);

    const result = await runAt(morning(14));

    expect(delivered).toEqual([]);
    expect(digestOf(id)).toBe("digest-from-another-run");
    expect(log).toEqual([]);
    expect(result.summary).toContain("request: 0 sent, 1 already");
  });

  it("retries a failed send the next morning with a fresh link", async () => {
    const id = seedQuote();
    failNext.add(id);
    await runAt(morning(14));
    expect(delivered).toEqual([]);

    await runAt(morning(13));

    expect(sentKinds()).toEqual([`balance-request:${id}`]);
    expect(linkIn(delivered[0].message)).toBe("token-2");
    expect(digestOf(id)).toBe("digest-2");
  });

  it("skips a quote with no lead, no address or an anonymised lead — no claim, no new link", async () => {
    const noLead = seedQuote({ lead: null });
    const noEmail = seedQuote({ lead: { email: "" } });
    const erased = seedQuote({ lead: { anonymisedAt: new Date("2026-07-01T00:00:00Z") } });

    const result = await runAt(morning(14));

    expect(delivered).toEqual([]);
    expect(log).toEqual([]);
    expect(minted).toBe(0);
    expect(digestOf(noLead)).toBe("original-digest-1");
    expect(digestOf(noEmail)).toBe("original-digest-2");
    expect(digestOf(erased)).toBe("original-digest-3");
    expect(result.summary).toContain("request: 0 sent, 0 already, 3 skipped, 0 failed");
  });

  it("does nothing at all where mail or quote links are not configured", async () => {
    const id = seedQuote();

    emailConfigured = false;
    expect((await runAt(morning(14))).summary).toMatch(/^not run/);
    emailConfigured = true;
    tokensConfigured = false;
    expect((await runAt(morning(14))).summary).toMatch(/^not run/);

    expect(delivered).toEqual([]);
    expect(log).toEqual([]);
    expect(digestOf(id)).toBe("original-digest-1");
  });

  it("releases, cancels and re-states nothing for a balance still unpaid after the event", async () => {
    const id = seedQuote();
    await runAt(morning(14));
    await runAt(morning(7));
    const before = structuredClone(store.get(id));

    for (let day = 0; day <= 3; day += 1) {
      await runAt(new Date(`${shift(EVENT, day)}T06:00:00Z`));
    }

    expect(store.get(id)).toEqual(before);
    expect(sentKinds()).toEqual([`balance-request:${id}`, `balance-reminder:${id}`]);
  });
});

describe("the dispatcher's view", () => {
  it("registers itself and summarises both passes", async () => {
    seedQuote();

    const result = await runAt(morning(14));

    expect(register).toHaveBeenCalledWith(balanceScheduler);
    expect(result.summary).toBe(
      "request: 1 sent, 0 already, 0 skipped, 0 failed · reminder: 0 sent, 0 already, 0 skipped, 0 failed",
    );
  });

  it("reports a pass whose quotes cannot be read, and still runs the other", async () => {
    unreadable = true;

    const result = await runAt(morning(14));

    expect(result.summary).toMatch(/^request: not run — quotes could not be read · reminder: /);
    expect(captureError).toHaveBeenCalledOnce();
  });
});
