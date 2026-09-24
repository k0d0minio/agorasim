import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The one-click endpoint and the page's button — the two ways onto the
 * suppression list — tested at their boundaries: the list
 * (`lib/email-opt-out`), the throttle and the client IP. The token is the real
 * one, signed under the test secret in `vitest.config.mts`, so "a forged token
 * writes nothing" is proved against the real verifier.
 */

let recorded: { addressHash: string; via: string }[] = [];
let throttled = false;
let storeDown = false;

vi.mock("@/lib/email-opt-out", () => ({
  recordOptOut: async (addressHash: string, via: string) => {
    if (storeDown) throw new Error("connection timeout");
    const repeat = recorded.some((row) => row.addressHash === addressHash);
    if (!repeat) recorded.push({ addressHash, via });
    return { recorded: !repeat, consentWithdrawn: 0 };
  },
}));

vi.mock("@/lib/rate-limit", () => ({
  OPT_OUT_RATE_LIMIT: { limit: 20, windowSeconds: 600 },
  rateLimit: async () =>
    throttled ? { allowed: false, retryAfterSeconds: 60 } : { allowed: true, retryAfterSeconds: 0 },
}));

vi.mock("@/lib/request-ip", () => ({ clientIp: async () => "203.0.113.9" }));

const { POST } = await import("./route");
const { optOutFromLink } = await import("@/app/[locale]/reserva/deixar-de-receber/actions");
const { optOutAddressHash, optOutToken } = await import("@/lib/email-opt-out-token");

function post(token: string) {
  return POST(
    new Request(`https://agorasim.pt/api/email/opt-out/${token}`, {
      method: "POST",
      body: "List-Unsubscribe=One-Click",
      headers: { "content-type": "application/x-www-form-urlencoded" },
    }),
    { params: Promise.resolve({ token }) },
  );
}

function press(token: string) {
  const form = new FormData();
  form.set("token", token);
  return optOutFromLink({ status: "idle" }, form);
}

beforeEach(() => {
  recorded = [];
  throttled = false;
  storeDown = false;
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

describe("POST /api/email/opt-out/[token] — RFC 8058 one-click", () => {
  it("records a one-click opt-out for the token's address and answers 200", async () => {
    const response = await post(await optOutToken("marta@example.pt"));

    expect(response.status).toBe(200);
    expect(recorded).toEqual([
      { addressHash: await optOutAddressHash("marta@example.pt"), via: "one-click" },
    ]);
  });

  it("is idempotent — a second POST is still a 200 and records nothing new", async () => {
    const token = await optOutToken("marta@example.pt");
    await post(token);
    const again = await post(token);

    expect(again.status).toBe(200);
    expect(recorded).toHaveLength(1);
  });

  it("writes nothing for a forged or malformed token", async () => {
    const [hash] = (await optOutToken("marta@example.pt")).split(".");

    expect((await post(`${hash}.${"x".repeat(43)}`)).status).toBe(400);
    expect((await post("not-a-token")).status).toBe(400);
    expect(recorded).toHaveLength(0);
  });

  it("answers 429 when throttled, before looking at the token", async () => {
    throttled = true;
    expect((await post(await optOutToken("marta@example.pt"))).status).toBe(429);
    expect(recorded).toHaveLength(0);
  });

  it("answers 503 when the list cannot be written", async () => {
    storeDown = true;
    expect((await post(await optOutToken("marta@example.pt"))).status).toBe(503);
  });
});

describe("optOutFromLink — the page's button", () => {
  it("records a page opt-out and reads as done", async () => {
    expect(await press(await optOutToken("marta@example.pt"))).toEqual({ status: "done" });
    expect(recorded).toEqual([
      { addressHash: await optOutAddressHash("marta@example.pt"), via: "page" },
    ]);
  });

  it("reads as done on a repeat press, without a second row", async () => {
    const token = await optOutToken("marta@example.pt");
    await press(token);

    expect(await press(token)).toEqual({ status: "done" });
    expect(recorded).toHaveLength(1);
  });

  it("gives a forged token the neutral invalid answer and writes nothing", async () => {
    const [hash] = (await optOutToken("marta@example.pt")).split(".");

    expect(await press(`${hash}.${"x".repeat(43)}`)).toEqual({ status: "invalid" });
    expect(await press("")).toEqual({ status: "invalid" });
    expect(recorded).toHaveLength(0);
  });

  it("says so when throttled or when the write fails", async () => {
    const token = await optOutToken("marta@example.pt");

    throttled = true;
    expect(await press(token)).toEqual({ status: "error", error: "rateLimited" });

    throttled = false;
    storeDown = true;
    expect(await press(token)).toEqual({ status: "error", error: "generic" });
  });
});
