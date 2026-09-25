import { afterEach, describe, expect, it, vi } from "vitest";
import {
  isOptOutConfigured,
  looksLikeOptOutToken,
  optOutAddressHash,
  optOutOneClickPath,
  optOutPath,
  optOutToken,
  verifyOptOutToken,
} from "./email-opt-out-token";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("optOutAddressHash", () => {
  it("is 64 hex characters and never contains the address", async () => {
    const hash = await optOutAddressHash("marta@example.pt");

    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hash).not.toContain("marta");
  });

  // The objection is the person's, not one spelling of their address: the
  // checkout lowercases, a typed-in phone booking may not.
  it("normalises case and surrounding space, so one person is one row", async () => {
    expect(await optOutAddressHash("  Marta@Example.PT ")).toBe(
      await optOutAddressHash("marta@example.pt"),
    );
  });

  it("tells two addresses apart", async () => {
    expect(await optOutAddressHash("a@example.pt")).not.toBe(
      await optOutAddressHash("b@example.pt"),
    );
  });

  it("is keyed: another secret gives another hash", async () => {
    const hash = await optOutAddressHash("marta@example.pt");

    vi.stubEnv("EMAIL_OPT_OUT_SECRET", "another-secret");
    expect(await optOutAddressHash("marta@example.pt")).not.toBe(hash);
  });

  it("throws rather than hashing without a secret — callers fail closed", async () => {
    vi.stubEnv("EMAIL_OPT_OUT_SECRET", "");

    expect(isOptOutConfigured()).toBe(false);
    await expect(optOutAddressHash("marta@example.pt")).rejects.toThrow(/EMAIL_OPT_OUT_SECRET/);
  });
});

describe("optOutToken / verifyOptOutToken", () => {
  it("round-trips to the address hash — the row the opt-out writes", async () => {
    const token = await optOutToken("marta@example.pt");

    expect(looksLikeOptOutToken(token)).toBe(true);
    expect(await verifyOptOutToken(token)).toBe(await optOutAddressHash("marta@example.pt"));
  });

  it("carries no address in the clear", async () => {
    const token = await optOutToken("marta@example.pt");

    expect(token).not.toContain("marta");
    expect(Buffer.from(token.split(".")[0], "base64url").toString("utf8")).not.toContain("marta");
  });

  it("rejects a forged signature", async () => {
    const token = await optOutToken("marta@example.pt");
    const [hash, signature] = token.split(".");
    const flipped = signature.startsWith("A") ? `B${signature.slice(1)}` : `A${signature.slice(1)}`;

    expect(await verifyOptOutToken(`${hash}.${flipped}`)).toBeNull();
  });

  // Somebody else's hash with my valid signature must not opt them out.
  it("rejects a valid signature moved onto another address's hash", async () => {
    const mine = await optOutToken("marta@example.pt");
    const theirs = await optOutToken("joao@example.pt");

    expect(await verifyOptOutToken(`${theirs.split(".")[0]}.${mine.split(".")[1]}`)).toBeNull();
  });

  it("rejects a token signed under another secret", async () => {
    vi.stubEnv("EMAIL_OPT_OUT_SECRET", "an-attackers-guess");
    const forged = await optOutToken("marta@example.pt");
    vi.unstubAllEnvs();

    expect(await verifyOptOutToken(forged)).toBeNull();
  });

  it.each([
    ["an empty string", ""],
    ["no separator", "a".repeat(86)],
    ["a truncated link", "a".repeat(43) + "." + "b".repeat(20)],
    ["characters outside base64url", "a".repeat(42) + "+." + "b".repeat(43)],
    ["a non-string", 42],
  ])("rejects %s without throwing", async (_label, value) => {
    expect(await verifyOptOutToken(value)).toBeNull();
  });
});

describe("paths", () => {
  it("puts the token in the path, never a query string", () => {
    expect(optOutPath("pt", "tok")).toBe("/pt/reserva/deixar-de-receber/tok");
    expect(optOutPath("en", "tok")).toBe("/en/reserva/deixar-de-receber/tok");
    expect(optOutOneClickPath("tok")).toBe("/api/email/opt-out/tok");
  });
});
