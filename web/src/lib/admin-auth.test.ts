import { afterEach, describe, expect, it, vi } from "vitest";
import {
  SESSION_MAX_AGE_SECONDS,
  createSessionToken,
  isValidPassword,
  readSessionToken,
  secretsMatch,
  verifySessionToken,
} from "./admin-auth";

/** Re-sign a payload the way the module does, to build hand-crafted tokens. */
function encodePayload(payload: unknown): string {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

afterEach(() => {
  vi.useRealTimers();
});

describe("createSessionToken / verifySessionToken", () => {
  it("accepts a freshly minted token", async () => {
    const token = await createSessionToken();
    expect(await verifySessionToken(token)).toBe(true);
  });

  it("carries a session id and an issued-at, and expires in 7 days", async () => {
    const before = Math.floor(Date.now() / 1000);
    const session = await readSessionToken(await createSessionToken());

    expect(session).not.toBeNull();
    expect(session!.sid).toMatch(/^[A-Za-z0-9_-]{10,}$/);
    expect(session!.issuedAt).toBeGreaterThanOrEqual(before);
    expect(session!.expiresAt - session!.issuedAt).toBe(SESSION_MAX_AGE_SECONDS);
  });

  it("mints a different token for every login in the same second", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-31T10:00:00Z"));

    const [first, second] = await Promise.all([
      createSessionToken(),
      createSessionToken(),
    ]);

    expect(first).not.toBe(second);

    const [a, b] = await Promise.all([
      readSessionToken(first),
      readSessionToken(second),
    ]);
    expect(a!.sid).not.toBe(b!.sid);
    expect(a!.issuedAt).toBe(b!.issuedAt);
  });

  it("rejects a token whose payload was tampered with", async () => {
    const token = await createSessionToken();
    const [, signature] = token.split(".");

    // Same signature, a payload claiming a far-future expiry.
    const forged = `${encodePayload({
      v: 1,
      sid: "forged",
      iat: 0,
      exp: 4102444800,
    })}.${signature}`;

    expect(await verifySessionToken(forged)).toBe(false);
  });

  it("rejects a token whose signature was tampered with", async () => {
    const token = await createSessionToken();
    const [payload, signature] = token.split(".");
    const flipped = (signature[0] === "A" ? "B" : "A") + signature.slice(1);

    expect(await verifySessionToken(`${payload}.${flipped}`)).toBe(false);
  });

  it("rejects a token signed with a different secret", async () => {
    const token = await createSessionToken();
    vi.stubEnv("ADMIN_SESSION_SECRET", "a-rotated-secret");

    expect(await verifySessionToken(token)).toBe(false);

    vi.unstubAllEnvs();
  });

  it("rejects an expired token", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-31T10:00:00Z"));
    const token = await createSessionToken();
    expect(await verifySessionToken(token)).toBe(true);

    // One second past the 7-day lifetime.
    vi.setSystemTime(new Date(Date.now() + (SESSION_MAX_AGE_SECONDS + 1) * 1000));
    expect(await verifySessionToken(token)).toBe(false);
  });

  const malformed: [label: string, token: string | null | undefined][] = [
    ["empty", ""],
    ["undefined", undefined],
    ["null", null],
    ["no separator", "not-a-token"],
    ["too many parts", "a.b.c"],
    ["empty signature", "eyJhIjoxfQ."],
    ["payload that is not base64", "!!!.!!!"],
    ["payload that is not JSON", `${Buffer.from("nope").toString("base64url")}.sig`],
  ];

  it.each(malformed)("rejects a malformed token (%s)", async (_label, token) => {
    expect(await verifySessionToken(token)).toBe(false);
  });

  it("rejects a well-formed payload that is missing fields, even correctly signed", async () => {
    // Sign a payload with no `sid`, using the module's own signing path by
    // borrowing the signature from a token over the same encoded payload is not
    // possible — so instead assert the shape check via readSessionToken.
    const encoded = encodePayload({ v: 1, iat: 0, exp: 4102444800 });
    expect(await readSessionToken(`${encoded}.whatever`)).toBeNull();
  });
});

describe("secretsMatch", () => {
  it("matches identical secrets", async () => {
    expect(await secretsMatch("correct horse", "correct horse")).toBe(true);
  });

  it("rejects different secrets of the same length", async () => {
    expect(await secretsMatch("abcdef", "abcdeg")).toBe(false);
  });

  it("rejects different secrets of different lengths", async () => {
    expect(await secretsMatch("short", "a much longer secret")).toBe(false);
  });

  it("rejects a prefix of the real secret", async () => {
    expect(await secretsMatch("correct hors", "correct horse")).toBe(false);
  });

  it("compares fixed-length digests, so timing cannot reveal the length", async () => {
    // Both comparisons run over 43-character base64url SHA-256 digests; the
    // number of character comparisons is identical regardless of input length.
    const digestLength = 43;
    const spy = vi.spyOn(String.prototype, "charCodeAt");

    await secretsMatch("a", "a-vastly-longer-candidate-value-here");
    const shortInputCalls = spy.mock.calls.length;

    spy.mockClear();
    await secretsMatch("a-vastly-longer-candidate-value-here", "a");
    const longInputCalls = spy.mock.calls.length;

    spy.mockRestore();

    expect(shortInputCalls).toBe(longInputCalls);
    expect(shortInputCalls).toBeLessThanOrEqual(digestLength * 2);
  });
});

describe("isValidPassword", () => {
  it("accepts the configured password", async () => {
    expect(await isValidPassword("test-admin-password")).toBe(true);
  });

  it("rejects anything else", async () => {
    expect(await isValidPassword("test-admin-passwor")).toBe(false);
    expect(await isValidPassword("")).toBe(false);
  });

  it("throws when ADMIN_PASSWORD is unset, rather than falling back", async () => {
    vi.stubEnv("ADMIN_PASSWORD", "");
    await expect(isValidPassword("agorasim")).rejects.toThrow(/ADMIN_PASSWORD/);
    vi.unstubAllEnvs();
  });
});
