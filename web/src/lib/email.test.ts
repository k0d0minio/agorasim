import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { site } from "@/content/site";
import { sendEmail, type EmailMessage } from "@/lib/email";

/**
 * The one place every automatic mail passes through on its way to Resend.
 *
 * What is worth pinning here is the request body, because that is the contract
 * with the provider: the `From:` comes from the environment, and every message
 * answers to a person — `site.email` unless the composer named someone better.
 * A confirmation that replied to `reservas@` would be a guest writing "can we
 * make it four?" into an inbox nobody reads.
 */

const fetchMock = vi.fn<typeof fetch>();

function message(overrides: Partial<EmailMessage> = {}): EmailMessage {
  return {
    to: ["sofia@example.com"],
    subject: "Reserva confirmada",
    text: "Olá Sofia",
    ...overrides,
  };
}

/** The JSON Resend would have received on the last call. */
function lastBody(): Record<string, unknown> {
  const init = fetchMock.mock.calls.at(-1)?.[1];
  return JSON.parse(String(init?.body)) as Record<string, unknown>;
}

beforeEach(() => {
  vi.stubEnv("RESEND_API_KEY", "re_test_123");
  vi.stubEnv("BOOKING_EMAIL_FROM", "Agorasim <reservas@agorasim.pt>");
  fetchMock.mockReset();
  fetchMock.mockResolvedValue(
    new Response(JSON.stringify({ id: "re_1" }), {
      status: 200,
      headers: { "content-type": "application/json" },
    }),
  );
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("sendEmail — reply-to", () => {
  it("defaults reply_to to the business inbox when the message sets none", async () => {
    const result = await sendEmail(message());

    expect(result).toEqual({ sent: true, id: "re_1" });
    expect(lastBody().reply_to).toBe(site.email);
    expect(lastBody().reply_to).toBe("info@agorasim.pt");
  });

  it("keeps a reply-to the caller set", async () => {
    await sendEmail(message({ replyTo: "sofia@example.com" }));

    expect(lastBody().reply_to).toBe("sofia@example.com");
  });

  it("treats an empty reply-to as unset", async () => {
    await sendEmail(message({ replyTo: "" }));

    expect(lastBody().reply_to).toBe(site.email);
  });

  it("sends from BOOKING_EMAIL_FROM, never from the reply-to", async () => {
    await sendEmail(message());

    const body = lastBody();
    expect(body.from).toBe("Agorasim <reservas@agorasim.pt>");
    expect(body.from).not.toBe(body.reply_to);
  });
});

describe("sendEmail — unconfigured", () => {
  it("skips the send without calling Resend when the sender is unset", async () => {
    vi.stubEnv("BOOKING_EMAIL_FROM", "");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    const result = await sendEmail(message());

    expect(result).toEqual({ sent: false, reason: "unconfigured" });
    expect(fetchMock).not.toHaveBeenCalled();
    warn.mockRestore();
  });
});
