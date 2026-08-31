import { afterEach, describe, expect, it, vi } from "vitest";
import {
  CANCELLATION_TOKEN_BYTES,
  cancellationTokenDigest,
  cancellationTokenMatches,
  isCancellationTokenConfigured,
  issueCancellationToken,
  looksLikeCancellationToken,
} from "./cancellation-token";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("issueCancellationToken", () => {
  it("mints the full entropy, base64url-encoded and unpadded", async () => {
    const { token } = await issueCancellationToken();

    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(Buffer.from(token, "base64url")).toHaveLength(CANCELLATION_TOKEN_BYTES);
  });

  it("never repeats itself", async () => {
    const issued = await Promise.all(
      Array.from({ length: 32 }, () => issueCancellationToken()),
    );

    expect(new Set(issued.map((entry) => entry.token)).size).toBe(issued.length);
    expect(new Set(issued.map((entry) => entry.digest)).size).toBe(issued.length);
  });

  it("returns a digest of the token it returns, not of something else", async () => {
    const { token, digest } = await issueCancellationToken();

    expect(digest).toBe(await cancellationTokenDigest(token));
  });

  // The whole point of hashing at rest: a `bookings` dump is not a stack of
  // working cancel links.
  it("does not leak the token into the digest", async () => {
    const { token, digest } = await issueCancellationToken();

    expect(digest).not.toContain(token);
  });
});

describe("cancellationTokenDigest", () => {
  it("is self-describing and deterministic — it is the lookup key", async () => {
    const first = await cancellationTokenDigest("a-token");
    const second = await cancellationTokenDigest("a-token");

    expect(first).toBe(second);
    expect(first.startsWith("hmac-sha256$")).toBe(true);
  });

  it("is keyed: the same token under another secret is another digest", async () => {
    const { token, digest } = await issueCancellationToken();

    vi.stubEnv("BOOKING_TOKEN_SECRET", "a-rotated-secret");
    expect(await cancellationTokenDigest(token)).not.toBe(digest);
  });

  it("fails closed when the secret is unset rather than minting a forgeable token", async () => {
    vi.stubEnv("BOOKING_TOKEN_SECRET", "");

    expect(isCancellationTokenConfigured()).toBe(false);
    await expect(issueCancellationToken()).rejects.toThrow(/BOOKING_TOKEN_SECRET/);
  });
});

describe("looksLikeCancellationToken", () => {
  it("accepts what the minter produces", async () => {
    const { token } = await issueCancellationToken();

    expect(looksLikeCancellationToken(token)).toBe(true);
  });

  it("rejects the traffic a public URL segment attracts", () => {
    for (const value of [
      "",
      "favicon.ico",
      "../../etc/passwd",
      // A link truncated by a mail client.
      "abcdefghijklmnopqrstuvwxyz",
      // Padded, or otherwise not the shape 32 bytes of base64url takes.
      `${"a".repeat(43)}=`,
      null,
      undefined,
      42,
    ]) {
      expect(looksLikeCancellationToken(value)).toBe(false);
    }
  });
});

describe("cancellationTokenMatches", () => {
  it("accepts the token its digest was made from", async () => {
    const { token, digest } = await issueCancellationToken();

    expect(await cancellationTokenMatches(token, digest)).toBe(true);
  });

  it("rejects another booking's token", async () => {
    const mine = await issueCancellationToken();
    const theirs = await issueCancellationToken();

    expect(await cancellationTokenMatches(theirs.token, mine.digest)).toBe(false);
  });

  // Null is how a spent, revoked or never-issued token reads on the row, and
  // all three have to mean "no self-serve cancellation".
  it("rejects a missing or unrecognised digest without throwing", async () => {
    const { token } = await issueCancellationToken();

    expect(await cancellationTokenMatches(token, null)).toBe(false);
    expect(await cancellationTokenMatches(token, undefined)).toBe(false);
    expect(await cancellationTokenMatches(token, "")).toBe(false);
    expect(await cancellationTokenMatches(token, "scrypt$32768$8$1$aa$bb")).toBe(false);
  });

  it("rejects a malformed candidate before hashing anything", async () => {
    const { digest } = await issueCancellationToken();

    expect(await cancellationTokenMatches("nope", digest)).toBe(false);
  });
});
