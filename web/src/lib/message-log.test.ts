import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The message log is tested at its two boundaries — `@/db` and `lib/email` —
 * because what the wrapper is *for* lives exactly there: the order of the claim
 * and the send, and what the row says afterwards.
 *
 * The real schema is imported underneath (the shape `webhook/route.test.ts`
 * uses) so `eq()` builds genuine SQL against genuine columns and a renamed
 * column fails the suite rather than passing it quietly.
 */

/** Every call the wrapper makes, in order — the claim-before-send assertion. */
let trace: string[] = [];

const insertedRows: Record<string, unknown>[] = [];
const updatedPatches: Record<string, unknown>[] = [];

/** What the claim insert resolves to: `[]` is a lost race, an Error is a dead database. */
let claimResult: unknown = [{ id: "log-1" }];

const fakeDb = {
  insert() {
    return {
      values(row: Record<string, unknown>) {
        trace.push("claim");
        insertedRows.push(row);
        return {
          onConflictDoNothing: () => ({
            returning: () =>
              claimResult instanceof Error
                ? Promise.reject(claimResult)
                : Promise.resolve(claimResult),
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
        return { where: () => Promise.resolve(undefined) };
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

const SUBJECT = {
  kind: "booking-confirmation",
  recipient: "guest",
  bookingId: "11111111-2222-3333-4444-555555555555",
  tourRequestId: "66666666-7777-8888-9999-000000000000",
} as const;

const MESSAGE = {
  to: ["guest@example.com"],
  subject: "Reserva confirmada",
  text: "Até já.",
};

beforeEach(() => {
  trace = [];
  insertedRows.length = 0;
  updatedPatches.length = 0;
  claimResult = [{ id: "log-1" }];
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
      bookingId: SUBJECT.bookingId,
      tourRequestId: SUBJECT.tourRequestId,
      status: "sending",
    });
    expect(updatedPatches[0]).toMatchObject({
      status: "sent",
      providerMessageId: "re_1",
    });
    expect(result).toEqual({ status: "sent", providerMessageId: "re_1" });
  });

  it("sends nothing when the claim is already taken", async () => {
    // What the unique index does to the second caller: no row back.
    claimResult = [];

    expect(await sendLoggedEmail(SUBJECT, MESSAGE)).toEqual({ status: "duplicate" });
    expect(trace).toEqual(["claim"]);
    expect(sendEmail).not.toHaveBeenCalled();
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
    claimResult = new Error("connection reset");

    expect(await sendLoggedEmail(SUBJECT, MESSAGE)).toEqual({
      status: "sent",
      providerMessageId: "re_1",
    });
    // The guest who paid still gets their mail; nothing is settled because
    // nothing was claimed.
    expect(trace).toEqual(["claim", "send"]);
  });
});
