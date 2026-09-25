import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { BookingToThank } from "@/lib/bookings";
import type { EmailMessage } from "@/lib/email";
import type { LoggedSend, MessageSubject } from "@/lib/message-log";

/**
 * The thank-you job, tested at its boundaries: the day's bookings
 * (`lib/bookings`), the suppression list (`lib/email-opt-out`), the log that
 * claims each send (`lib/message-log`) and the catalogue that names the tour.
 *
 * The fake log keys a claim as `message_log_booking_kind_key` does — kind,
 * recipient, booking, **no date** — and releases it when a send fails, so
 * "once per booking, ever", "a rerun sends nothing" and "a failed send is
 * retried the next morning" are answered here the way Postgres would answer
 * them. The opt-out token is the real one (the test secret is in
 * `vitest.config.mts`), so the links in the mail are genuine.
 */

let bookingsByDate: Record<string, BookingToThank[]> = {};
let claims = new Set<string>();
let delivered: { subject: MessageSubject; message: EmailMessage }[] = [];
let failNext = new Set<string>();
let unreadable = new Set<string>();
let optedOut = new Set<string>();

const claimKey = (subject: MessageSubject) =>
  `${subject.kind}:${subject.recipient}:${subject.bookingId}:${subject.subjectDate ?? ""}`;

vi.mock("@/lib/bookings", async () => {
  const actual = await vi.importActual<typeof import("@/lib/bookings")>("@/lib/bookings");
  return {
    ...actual,
    bookingsToThankOn: async (date: string) => {
      if (unreadable.has(date)) throw new Error("connection timeout");
      return bookingsByDate[date] ?? [];
    },
  };
});

vi.mock("@/lib/email-opt-out", () => ({
  isOptedOut: async (email: string) => optedOut.has(email.trim().toLowerCase()),
}));

vi.mock("@/lib/message-log", () => ({
  sendLoggedEmail: async (subject: MessageSubject, message: EmailMessage): Promise<LoggedSend> => {
    const key = claimKey(subject);
    if (claims.has(key)) return { status: "duplicate" };
    if (failNext.has(String(subject.bookingId))) {
      failNext.delete(String(subject.bookingId));
      return { status: "failed", reason: "failed" };
    }
    claims.add(key);
    delivered.push({ subject, message });
    return { status: "sent", providerMessageId: `re_${delivered.length}` };
  },
}));

vi.mock("@/lib/experience-catalogue", () => ({
  listCatalogue: async () => [
    { slug: "rural-saloia", title: { pt: "Rural Saloia", en: "Rural Saloia" } },
    {
      slug: "obidos-medieval-villages",
      title: { pt: "Óbidos & Aldeias Medievais", en: "Óbidos & Medieval Villages" },
    },
  ],
}));

const captureError = vi.fn();
const captureAlert = vi.fn();
vi.mock("@/lib/observability", () => ({
  captureError: (...args: unknown[]) => captureError(...args),
  captureAlert: (...args: unknown[]) => captureAlert(...args),
}));

const register = vi.fn();
vi.mock("@/lib/cron/jobs", () => ({ register: (...args: unknown[]) => register(...args) }));

const { thankYouReview, thankYouDays, THANK_YOU_REVIEW_JOB } = await import("./thank-you-review");
const { verifyOptOutToken, optOutAddressHash } = await import("@/lib/email-opt-out-token");

/** 07:00 in Lisbon (WEST) on Sunday 16 August — the dispatcher's morning. */
const NOW = new Date("2026-08-16T06:00:00Z");
const YESTERDAY = "2026-08-15";
const DAY_BEFORE = "2026-08-14";

let serial = 0;
function booking(overrides: Partial<BookingToThank> = {}): BookingToThank {
  serial += 1;
  return {
    id: `${String(serial).padStart(8, "0")}-0000-4000-8000-000000000000`,
    tourRequestId: `lead-${serial}`,
    name: `Guest ${serial}`,
    email: `guest${serial}@example.com`,
    locale: "pt",
    date: YESTERDAY,
    experienceSlug: "rural-saloia",
    ...overrides,
  };
}

function seed(...rows: BookingToThank[]) {
  bookingsByDate = {};
  for (const row of rows) (bookingsByDate[row.date] ??= []).push(row);
}

function sentTo(): string[] {
  return delivered.map((entry) => entry.message.to[0]);
}

beforeEach(() => {
  bookingsByDate = {};
  claims = new Set();
  delivered = [];
  failNext = new Set();
  unreadable = new Set();
  optedOut = new Set();
  captureError.mockClear();
  captureAlert.mockClear();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("thankYouDays", () => {
  it("reads yesterday and the day before on Lisbon's calendar, not the server's", () => {
    expect(thankYouDays(NOW)).toEqual({ yesterday: YESTERDAY, dayBefore: DAY_BEFORE });
    // 23:30 UTC in summer is already 00:30 the next day in Lisbon.
    expect(thankYouDays(new Date("2026-08-16T23:30:00Z"))).toEqual({
      yesterday: "2026-08-16",
      dayBefore: "2026-08-15",
    });
    // In winter Lisbon is on UTC.
    expect(thankYouDays(new Date("2026-01-16T23:30:00Z"))).toEqual({
      yesterday: "2026-01-15",
      dayBefore: "2026-01-14",
    });
  });

  it("crosses months, years and the clock change without skipping a day", () => {
    expect(thankYouDays(new Date("2027-01-01T06:00:00Z"))).toEqual({
      yesterday: "2026-12-31",
      dayBefore: "2026-12-30",
    });
    // Monday 30 March 2026, the morning after the clocks went forward.
    expect(thankYouDays(new Date("2026-03-30T06:00:00Z"))).toEqual({
      yesterday: "2026-03-29",
      dayBefore: "2026-03-28",
    });
  });
});

describe("thankYouReview", () => {
  it("registers itself with the dispatcher", () => {
    expect(register).toHaveBeenCalledWith(thankYouReview);
  });

  it("thanks every booking from yesterday, once, in its own language, with the review and opt-out links", async () => {
    const pt = booking();
    const en = booking({ locale: "en", experienceSlug: "obidos-medieval-villages" });
    seed(pt, en);

    const result = await thankYouReview(NOW);

    expect(sentTo()).toEqual([pt.email, en.email]);
    const [ptMail, enMail] = delivered;
    expect(ptMail.subject).toEqual({
      kind: "thank-you-review",
      recipient: "guest",
      bookingId: pt.id,
      tourRequestId: pt.tourRequestId,
    });
    expect(ptMail.message.subject).toBe(`Muito obrigado, ${pt.name}`);
    expect(enMail.message.subject).toBe(`Thank you so much, ${en.name}`);
    expect(enMail.message.text).toContain("g.page/r/CWIk-M6uFZMdEBM/review");
    expect(ptMail.message.headers?.["List-Unsubscribe-Post"]).toBe("List-Unsubscribe=One-Click");
    expect(result).toEqual({
      name: THANK_YOU_REVIEW_JOB,
      summary: `yesterday ${YESTERDAY}: 2 sent, 0 already thanked, 0 skipped, 0 opted out, 0 failed · day before ${DAY_BEFORE}: 0 sent, 0 already thanked, 0 skipped, 0 opted out, 0 failed`,
    });
  });

  it("links an opt-out page and endpoint whose token vouches for this guest's address", async () => {
    const guest = booking({ locale: "en" });
    seed(guest);

    await thankYouReview(NOW);

    const { text, headers } = delivered[0].message;
    const pageToken = text.match(/\/en\/reserva\/deixar-de-receber\/([A-Za-z0-9_.-]+)/)?.[1];
    const oneClickToken = headers?.["List-Unsubscribe"]?.match(/\/api\/email\/opt-out\/([A-Za-z0-9_.-]+)>/)?.[1];
    expect(pageToken).toBeDefined();
    expect(oneClickToken).toBe(pageToken);
    expect(await verifyOptOutToken(pageToken)).toBe(await optOutAddressHash(guest.email as string));
    // No address in the link.
    expect(pageToken).not.toContain("guest");
  });

  it("catches up the day before, and counts one already thanked as already", async () => {
    const missed = booking({ date: DAY_BEFORE });
    const thanked = booking({ date: DAY_BEFORE });
    claims.add(`thank-you-review:guest:${thanked.id}:`);
    seed(missed, thanked);

    const result = await thankYouReview(NOW);

    expect(sentTo()).toEqual([missed.email]);
    expect(result.summary).toContain(
      `day before ${DAY_BEFORE}: 1 sent, 1 already thanked, 0 skipped, 0 opted out, 0 failed`,
    );
  });

  it("sends nothing on a rerun the same morning, and nothing the next morning either", async () => {
    const guest = booking();
    seed(guest);

    await thankYouReview(NOW);
    await thankYouReview(NOW);
    // The next morning the same booking is "the day before" — still once.
    await thankYouReview(new Date("2026-08-17T06:00:00Z"));

    expect(sentTo()).toEqual([guest.email]);
  });

  it("retries a failed send the next morning, while the booking is inside the window", async () => {
    const guest = booking();
    seed(guest);
    failNext.add(guest.id);

    const first = await thankYouReview(NOW);
    expect(delivered).toHaveLength(0);
    expect(first.summary).toContain("0 sent, 0 already thanked, 0 skipped, 0 opted out, 1 failed");

    await thankYouReview(new Date("2026-08-17T06:00:00Z"));
    expect(sentTo()).toEqual([guest.email]);
  });

  it("thanks a moved booking only after its new date", async () => {
    // Moved from the 15th to the 20th: the query reads the current date, so
    // the 16th's run does not see it on the 15th, and the 21st's does.
    const moved = booking({ date: "2026-08-20" });
    seed(moved);

    await thankYouReview(NOW);
    expect(delivered).toHaveLength(0);

    await thankYouReview(new Date("2026-08-21T06:00:00Z"));
    expect(sentTo()).toEqual([moved.email]);
  });

  it("skips an opted-out address without claiming it", async () => {
    const out = booking({ email: "Out@Example.com" });
    const stays = booking();
    optedOut.add("out@example.com");
    seed(out, stays);

    const result = await thankYouReview(NOW);

    expect(sentTo()).toEqual([stays.email]);
    expect([...claims].some((key) => key.includes(out.id))).toBe(false);
    expect(result.summary).toContain(`yesterday ${YESTERDAY}: 1 sent, 0 already thanked, 0 skipped, 1 opted out, 0 failed`);
  });

  it("skips a booking with no enquiry or no address, without failing the job", async () => {
    const erased = booking({ tourRequestId: null, name: null, email: null });
    const fine = booking();
    seed(erased, fine);

    const result = await thankYouReview(NOW);

    expect(sentTo()).toEqual([fine.email]);
    expect(result.summary).toContain("1 sent, 0 already thanked, 1 skipped, 0 opted out, 0 failed");
  });

  it("reports a day whose bookings cannot be read, and still runs the other", async () => {
    unreadable.add(YESTERDAY);
    const late = booking({ date: DAY_BEFORE });
    seed(late);

    const result = await thankYouReview(NOW);

    expect(sentTo()).toEqual([late.email]);
    expect(result.summary).toContain(`yesterday ${YESTERDAY}: not run — bookings could not be read`);
    expect(captureError).toHaveBeenCalledTimes(1);
  });

  it("sends nothing without EMAIL_OPT_OUT_SECRET, and says so in the summary and the tracker", async () => {
    vi.stubEnv("EMAIL_OPT_OUT_SECRET", "");
    seed(booking());

    const result = await thankYouReview(NOW);

    expect(delivered).toHaveLength(0);
    expect(result).toEqual({
      name: THANK_YOU_REVIEW_JOB,
      summary: "not run — EMAIL_OPT_OUT_SECRET unset",
    });
    expect(captureAlert).toHaveBeenCalledTimes(1);
  });
});
