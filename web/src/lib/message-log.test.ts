import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The message log is tested at its two boundaries — `@/db` and `lib/email` —
 * because what the wrapper is *for* lives exactly there: the order of the claim
 * and the send, and what the row says afterwards.
 *
 * The real schema is imported underneath (the shape `webhook/route.test.ts`
 * uses) so `eq()` builds genuine SQL against genuine columns and a renamed
 * column fails the suite rather than passing it quietly.
 *
 * The fake below re-states the four partial unique indexes from
 * `db/schema.ts` as a key function, so "is this message already claimed?" is
 * answered here the way Postgres answers it. That is deliberately not a proof
 * that the indexes exist — they are in
 * `drizzle/0025_message_log_subject_date.sql` and
 * `drizzle/0027_quote_sent_per_quote.sql`, and only a database can check
 * them. What it does prove is the half of the mechanism that lives in this
 * file: the key each send is claimed under. A reminder that forgot its date
 * would land under the wrong index in production and be silently permanent,
 * and that is the mistake these tests are here to catch.
 */

/** Every call the wrapper makes, in order — the claim-before-send assertion. */
let trace: string[] = [];

type LogRow = {
  id: string;
  kind: string;
  recipient: string;
  bookingId: string | null;
  tourRequestId: string | null;
  subjectDate: string | null;
  quoteId: string | null;
  quoteSentAt: string | null;
  status: string;
};

/** The rows `message_log` holds, as the fake sees them. */
let rows: LogRow[] = [];
const insertedRows: Record<string, unknown>[] = [];
const updatedPatches: Record<string, unknown>[] = [];

/** Set to make the claim insert throw — the dead-database path. */
let claimError: Error | null = null;

/**
 * The `where` clause of whichever unique index claims this row, as one string —
 * or `null` for a row no index claims, which is exactly what `status = 'failed'`
 * buys: the attempt is kept and the message is free to be sent again.
 */
function indexKey(row: LogRow): string | null {
  if (row.status === "failed") return null;
  if (row.bookingId !== null) {
    // message_log_booking_kind_key / message_log_booking_date_kind_key — the
    // split is on `subject_date is null`, because a departure is a subject in
    // its own right and a booking's date can change under it.
    return row.subjectDate === null
      ? `booking:${row.kind}:${row.recipient}:${row.bookingId}`
      : `booking-date:${row.kind}:${row.recipient}:${row.bookingId}:${row.subjectDate}`;
  }
  if (row.quoteId !== null) {
    // message_log_quote_kind_key — one row per send of a quote, the send named
    // by the `sent_at` it stamped. A quote row without the stamp is claimed by
    // no index at all, which is why the type makes the stamp mandatory.
    return row.quoteSentAt === null
      ? null
      : `quote:${row.kind}:${row.recipient}:${row.quoteId}:${row.quoteSentAt}`;
  }
  // message_log_enquiry_kind_key
  return row.tourRequestId === null
    ? null
    : `enquiry:${row.kind}:${row.recipient}:${row.tourRequestId}`;
}

function isTaken(candidate: LogRow): boolean {
  const key = indexKey(candidate);
  return key !== null && rows.some((row) => indexKey(row) === key);
}

const fakeDb = {
  insert() {
    return {
      values(values: Record<string, unknown>) {
        trace.push("claim");
        insertedRows.push(values);
        const text = (value: unknown) => (typeof value === "string" ? value : null);
        const row: LogRow = {
          id: `log-${rows.length + 1}`,
          kind: String(values.kind),
          recipient: String(values.recipient),
          bookingId: text(values.bookingId),
          tourRequestId: text(values.tourRequestId),
          subjectDate: text(values.subjectDate),
          quoteId: text(values.quoteId),
          quoteSentAt:
            values.quoteSentAt instanceof Date ? values.quoteSentAt.toISOString() : null,
          status: String(values.status),
        };
        return {
          onConflictDoNothing: () => ({
            returning: () => {
              if (claimError) return Promise.reject(claimError);
              // `on conflict do nothing` returns no row to the loser.
              if (isTaken(row)) return Promise.resolve([]);
              rows.push(row);
              return Promise.resolve([{ id: row.id }]);
            },
          }),
        };
      },
    };
  },
  update() {
    return {
      set(patch: Record<string, unknown>) {
        trace.push("settle");
        updatedPatches.push(patch);
        return {
          where: () => {
            // The wrapper settles exactly the row it claimed, and there is only
            // ever one unsettled — so the `sending` row is the one to patch.
            const claimed = rows.find((row) => row.status === "sending");
            if (claimed) claimed.status = String(patch.status);
            return Promise.resolve(undefined);
          },
        };
      },
    };
  },
};

vi.mock("@/db", async () => {
  const schema = await vi.importActual<typeof import("@/db/schema")>("@/db/schema");
  return { ...schema, db: fakeDb };
});

let configured = true;
const sendEmail = vi.fn<
  () => Promise<
    { sent: true; id: string | null } | { sent: false; reason: "failed" | "no-recipient" }
  >
>();

vi.mock("@/lib/email", () => ({
  isEmailConfigured: () => configured,
  sendEmail: (...args: unknown[]) => {
    trace.push("send");
    return sendEmail(...(args as []));
  },
  teamRecipients: () => [],
  senderAddress: () => "hello@agorasim.pt",
}));

const { sendLoggedEmail } = await import("./message-log");

const BOOKING = "11111111-2222-3333-4444-555555555555";
const LEAD = "66666666-7777-8888-9999-000000000000";

const SUBJECT = {
  kind: "booking-confirmation",
  recipient: "guest",
  bookingId: BOOKING,
  tourRequestId: LEAD,
} as const;

const MESSAGE = {
  to: ["guest@example.com"],
  subject: "Reserva confirmada",
  text: "Até já.",
};

/** The dispatcher's reminder for one morning — the only date-bound send today. */
const reminder = (subjectDate: string) =>
  ({
    kind: "day-before-reminder",
    recipient: "guest",
    bookingId: BOOKING,
    tourRequestId: LEAD,
    subjectDate,
  }) as const;

beforeEach(() => {
  trace = [];
  rows = [];
  insertedRows.length = 0;
  updatedPatches.length = 0;
  claimError = null;
  configured = true;
  sendEmail.mockReset();
  sendEmail.mockResolvedValue({ sent: true, id: "re_1" });
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("sendLoggedEmail", () => {
  it("claims the row before calling the provider, then records the send", async () => {
    const result = await sendLoggedEmail(SUBJECT, MESSAGE);

    // The order is the idempotency: a row that only appeared after a successful
    // send would leave the window in which a second caller sends a second copy.
    expect(trace).toEqual(["claim", "send", "settle"]);
    expect(insertedRows[0]).toEqual({
      kind: "booking-confirmation",
      recipient: "guest",
      bookingId: BOOKING,
      tourRequestId: LEAD,
      // Null, not absent: it is what puts this row under the booking-shaped
      // index rather than the date-bound one.
      subjectDate: null,
      quoteId: null,
      quoteSentAt: null,
      status: "sending",
    });
    expect(updatedPatches[0]).toMatchObject({
      status: "sent",
      providerMessageId: "re_1",
    });
    expect(result).toEqual({ status: "sent", providerMessageId: "re_1" });
  });

  it("sends nothing when the claim is already taken", async () => {
    await sendLoggedEmail(SUBJECT, MESSAGE);
    trace = [];

    expect(await sendLoggedEmail(SUBJECT, MESSAGE)).toEqual({ status: "duplicate" });
    expect(trace).toEqual(["claim"]);
    expect(sendEmail).toHaveBeenCalledTimes(1);
  });

  it("leaves a failed row, which the partial index frees for a retry", async () => {
    sendEmail.mockResolvedValue({ sent: false, reason: "failed" });

    expect(await sendLoggedEmail(SUBJECT, MESSAGE)).toEqual({
      status: "failed",
      reason: "failed",
    });
    // Kept, not deleted: the attempt is worth seeing, and `status <> 'failed'`
    // in the index means it no longer reserves the message.
    expect(updatedPatches[0]).toMatchObject({
      status: "failed",
      failureReason: "failed",
    });

    sendEmail.mockResolvedValue({ sent: true, id: "re_2" });
    expect(await sendLoggedEmail(SUBJECT, MESSAGE)).toEqual({
      status: "sent",
      providerMessageId: "re_2",
    });
  });

  it("writes nothing at all when the deployment cannot send mail", async () => {
    configured = false;

    expect(await sendLoggedEmail(SUBJECT, MESSAGE)).toEqual({
      status: "skipped",
      reason: "unconfigured",
    });
    // No claim: a row here would stop the send that the configured deployment
    // will want to make tomorrow.
    expect(trace).toEqual([]);
  });

  it("writes nothing for a message with nobody to send it to", async () => {
    expect(await sendLoggedEmail(SUBJECT, { ...MESSAGE, to: [] })).toEqual({
      status: "skipped",
      reason: "no-recipient",
    });
    expect(trace).toEqual([]);
  });

  it("sends unlogged rather than losing a confirmation when the log is down", async () => {
    claimError = new Error("connection reset");

    expect(await sendLoggedEmail(SUBJECT, MESSAGE)).toEqual({
      status: "sent",
      providerMessageId: "re_1",
    });
    // The guest who paid still gets their mail; nothing is settled because
    // nothing was claimed.
    expect(trace).toEqual(["claim", "send"]);
  });
});

/**
 * The weather move, which is the reason `subject_date` exists.
 *
 * Diogo decides on Friday afternoon that Saturday is a write-off and moves the
 * booking to the following Saturday — by which time Saturday's reminder has
 * already gone out. Keyed on the booking alone, that reminder held the key for
 * ever and the guest was never told about the new morning.
 */
describe("a booking whose date changes", () => {
  it("is reminded again for the new date, and never twice for either", async () => {
    expect(await sendLoggedEmail(reminder("2026-08-15"), MESSAGE)).toMatchObject({
      status: "sent",
    });

    // The dispatcher asks every morning; the answer for a date already done is
    // no, whether it is asked once more or ten times.
    expect(await sendLoggedEmail(reminder("2026-08-15"), MESSAGE)).toEqual({
      status: "duplicate",
    });

    // Moved to the 22nd. Same booking, same kind, same recipient — a different
    // departure, so a message that has not been sent.
    expect(await sendLoggedEmail(reminder("2026-08-22"), MESSAGE)).toMatchObject({
      status: "sent",
    });
    expect(await sendLoggedEmail(reminder("2026-08-22"), MESSAGE)).toEqual({
      status: "duplicate",
    });

    expect(sendEmail).toHaveBeenCalledTimes(2);
    expect(rows.map((row) => row.subjectDate)).toEqual(["2026-08-15", "2026-08-22"]);
  });

  it("is told about each move, and not told twice about the same one", async () => {
    const moved = (subjectDate: string) =>
      ({
        kind: "booking-moved",
        recipient: "guest",
        bookingId: BOOKING,
        tourRequestId: LEAD,
        subjectDate,
      }) as const;

    expect(await sendLoggedEmail(moved("2026-08-22"), MESSAGE)).toMatchObject({
      status: "sent",
    });
    // The operator presses the button twice, or the action is retried.
    expect(await sendLoggedEmail(moved("2026-08-22"), MESSAGE)).toEqual({
      status: "duplicate",
    });
    // The forecast turns again: a real second move, and a guest who has to hear
    // about it.
    expect(await sendLoggedEmail(moved("2026-08-29"), MESSAGE)).toMatchObject({
      status: "sent",
    });

    expect(sendEmail).toHaveBeenCalledTimes(2);
  });

  it("keeps a date-bound send retryable after a failure on that same date", async () => {
    sendEmail.mockResolvedValue({ sent: false, reason: "failed" });
    expect(await sendLoggedEmail(reminder("2026-08-15"), MESSAGE)).toMatchObject({
      status: "failed",
    });

    // A failed reminder is a reminder the guest did not get: tomorrow's run of
    // the dispatcher must be free to try the same morning again.
    sendEmail.mockResolvedValue({ sent: true, id: "re_2" });
    expect(await sendLoggedEmail(reminder("2026-08-15"), MESSAGE)).toMatchObject({
      status: "sent",
    });
  });
});

/**
 * The once-only rule for the sends that used to bypass the log: the guest's
 * cancellation (`lib/booking-refund.ts`), the team's (`lib/booking-cancellation.ts`)
 * and the guest's move notice (`lib/booking-move.ts`).
 */
describe("the cancellation kinds", () => {
  const cancellation = (recipient: "guest" | "team") =>
    ({
      kind: "booking-cancellation",
      recipient,
      bookingId: BOOKING,
      tourRequestId: LEAD,
    }) as const;

  it("writes one row per recipient and refuses a second send of either", async () => {
    expect(await sendLoggedEmail(cancellation("guest"), MESSAGE)).toMatchObject({
      status: "sent",
    });
    // The team's copy is the same occasion and a different message — one kind,
    // two recipients, which is what makes "the guest was told and the team was
    // not" a state the Notifications page can show.
    expect(await sendLoggedEmail(cancellation("team"), MESSAGE)).toMatchObject({
      status: "sent",
    });

    // Both cancellation paths (the Sales board and the guest's own link) reach
    // the same booking; neither can now put a second notice in an inbox.
    expect(await sendLoggedEmail(cancellation("guest"), MESSAGE)).toEqual({
      status: "duplicate",
    });
    expect(await sendLoggedEmail(cancellation("team"), MESSAGE)).toEqual({
      status: "duplicate",
    });

    expect(sendEmail).toHaveBeenCalledTimes(2);
    expect(rows).toHaveLength(2);
    // No date on these: a booking is cancelled once, however often it moved
    // first.
    expect(rows.every((row) => row.subjectDate === null)).toBe(true);
  });

  it("is keyed apart from the confirmation of the same booking", async () => {
    await sendLoggedEmail(SUBJECT, MESSAGE);

    expect(await sendLoggedEmail(cancellation("guest"), MESSAGE)).toMatchObject({
      status: "sent",
    });
    expect(sendEmail).toHaveBeenCalledTimes(2);
  });
});

/**
 * A lead quoted more than once — the reason `quote_id` and `quote_sent_at`
 * exist. Keyed on the lead, as the enquiry ack is, the second version's email
 * would have lost its claim to the first and the couple would never see it.
 */
describe("the quote-sent kind", () => {
  const QUOTE_V1 = "aaaaaaaa-0000-0000-0000-000000000001";
  const QUOTE_V2 = "aaaaaaaa-0000-0000-0000-000000000002";

  const quoteSent = (quoteId: string, sentAt: string) =>
    ({
      kind: "quote-sent",
      recipient: "guest",
      tourRequestId: LEAD,
      quoteId,
      quoteSentAt: new Date(sentAt),
    }) as const;

  it("claims under the quote and its send, not under the lead", async () => {
    await sendLoggedEmail(quoteSent(QUOTE_V1, "2026-09-24T10:00:00Z"), MESSAGE);

    expect(insertedRows[0]).toMatchObject({
      kind: "quote-sent",
      tourRequestId: LEAD,
      bookingId: null,
      quoteId: QUOTE_V1,
      quoteSentAt: new Date("2026-09-24T10:00:00Z"),
    });
  });

  it("emails each version of a lead's quote once", async () => {
    expect(
      await sendLoggedEmail(quoteSent(QUOTE_V1, "2026-09-24T10:00:00Z"), MESSAGE),
    ).toMatchObject({ status: "sent" });
    // The new version replaces the first: same lead, same kind, same guest.
    expect(
      await sendLoggedEmail(quoteSent(QUOTE_V2, "2026-09-25T09:30:00Z"), MESSAGE),
    ).toMatchObject({ status: "sent" });

    expect(sendEmail).toHaveBeenCalledTimes(2);
  });

  it("emails a re-sent link, and never the same link twice", async () => {
    const first = quoteSent(QUOTE_V1, "2026-09-24T10:00:00Z");
    expect(await sendLoggedEmail(first, MESSAGE)).toMatchObject({ status: "sent" });
    // A double tap, or an action retried by the browser.
    expect(await sendLoggedEmail(first, MESSAGE)).toEqual({ status: "duplicate" });

    // "Reenviar" rotated the link, which stamped a new `sent_at`.
    expect(
      await sendLoggedEmail(quoteSent(QUOTE_V1, "2026-09-24T18:15:00Z"), MESSAGE),
    ).toMatchObject({ status: "sent" });

    expect(sendEmail).toHaveBeenCalledTimes(2);
  });

  it("leaves a failed quote email free to be tried again", async () => {
    sendEmail.mockResolvedValue({ sent: false, reason: "failed" });
    const send = quoteSent(QUOTE_V1, "2026-09-24T10:00:00Z");
    expect(await sendLoggedEmail(send, MESSAGE)).toMatchObject({ status: "failed" });

    sendEmail.mockResolvedValue({ sent: true, id: "re_2" });
    expect(await sendLoggedEmail(send, MESSAGE)).toMatchObject({ status: "sent" });
  });

  it("does not take the enquiry ack's claim on the same lead", async () => {
    const ack = { kind: "enquiry-ack", recipient: "guest", tourRequestId: LEAD } as const;
    await sendLoggedEmail(ack, MESSAGE);

    expect(
      await sendLoggedEmail(quoteSent(QUOTE_V1, "2026-09-24T10:00:00Z"), MESSAGE),
    ).toMatchObject({ status: "sent" });
    expect(await sendLoggedEmail(ack, MESSAGE)).toEqual({ status: "duplicate" });
  });
});
