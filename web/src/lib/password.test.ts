import { describe, expect, it } from "vitest";
import { SCRYPT_PARAMS, hashPassword, needsRehash, verifyPassword } from "./password";
import { MIN_PASSWORD_LENGTH } from "./password-policy";

/**
 * scrypt at the production cost is deliberately slow (~100 ms a hash), and these
 * tests hash a couple of dozen times. That is a few seconds, which is fine — the
 * alternative is testing parameters we do not ship.
 */
describe("hashPassword", () => {
  it("produces a self-describing digest carrying its own cost parameters", async () => {
    const digest = await hashPassword("correct horse battery staple");
    const [scheme, N, r, p, salt, hash] = digest.split("$");

    expect(scheme).toBe("scrypt");
    expect(Number(N)).toBe(SCRYPT_PARAMS.N);
    expect(Number(r)).toBe(SCRYPT_PARAMS.r);
    expect(Number(p)).toBe(SCRYPT_PARAMS.p);
    expect(Buffer.from(salt!, "base64")).toHaveLength(16);
    expect(Buffer.from(hash!, "base64")).toHaveLength(32);
  });

  it("never stores the password itself", async () => {
    const digest = await hashPassword("correct horse battery staple");
    expect(digest).not.toContain("correct horse");
  });

  it("salts, so the same password hashes differently every time", async () => {
    const [a, b] = await Promise.all([
      hashPassword("correct horse battery staple"),
      hashPassword("correct horse battery staple"),
    ]);
    expect(a).not.toBe(b);
  });
});

describe("verifyPassword", () => {
  it("accepts the password it was made from", async () => {
    const digest = await hashPassword("correct horse battery staple");
    expect(await verifyPassword("correct horse battery staple", digest)).toBe(true);
  });

  it("rejects anything else", async () => {
    const digest = await hashPassword("correct horse battery staple");

    expect(await verifyPassword("correct horse battery stapl", digest)).toBe(false);
    expect(await verifyPassword("Correct horse battery staple", digest)).toBe(false);
    expect(await verifyPassword("", digest)).toBe(false);
  });

  it("treats Unicode-equivalent passwords as the same one", async () => {
    // "café" typed on a Mac (composed) and on Windows (decomposed) are different
    // byte sequences for the same word, and both must sign in.
    const composed = "café passphrase";
    const decomposed = "café passphrase";

    const digest = await hashPassword(composed);
    expect(await verifyPassword(decomposed, digest)).toBe(true);
  });

  it("verifies a digest made with weaker parameters, using its own parameters", async () => {
    // Hand-built at N=1024 — what an old row would look like after the cost is
    // raised. It must still verify, or raising the cost locks everyone out.
    const legacy =
      "scrypt$1024$8$1$" +
      "c2FsdHlzYWx0eXNhbHR5cw==$" +
      // Derived below rather than hard-coded, so the fixture cannot drift.
      (await deriveLegacy("an old passphrase"));

    expect(await verifyPassword("an old passphrase", legacy)).toBe(true);
    expect(await verifyPassword("a different one", legacy)).toBe(false);
    expect(needsRehash(legacy)).toBe(true);
  });

  const malformed: [label: string, digest: string | null | undefined][] = [
    ["null", null],
    ["undefined", undefined],
    ["empty", ""],
    ["not a digest", "hunter2"],
    ["too few fields", "scrypt$32768$8$1$c2FsdA=="],
    ["unknown scheme", "bcrypt$32768$8$1$c2FsdA==$aGFzaA=="],
    ["non-numeric cost", "scrypt$many$8$1$c2FsdA==$aGFzaA=="],
    ["N that is not a power of two", "scrypt$1000$8$1$c2FsdA==$aGFzaA=="],
    ["empty salt", "scrypt$32768$8$1$$aGFzaA=="],
  ];

  it.each(malformed)("returns false for a malformed digest (%s)", async (_label, digest) => {
    // False rather than throwing: one corrupt row should lock out one account,
    // not take the whole login screen down.
    expect(await verifyPassword("anything", digest)).toBe(false);
  });
});

describe("needsRehash", () => {
  it("is false for a digest at the current cost", async () => {
    expect(needsRehash(await hashPassword("correct horse battery staple"))).toBe(false);
  });

  it("is true for something unparseable", () => {
    expect(needsRehash("hunter2")).toBe(true);
    expect(needsRehash(null)).toBe(true);
  });
});

describe("the password policy", () => {
  it("asks for length rather than composition", () => {
    expect(MIN_PASSWORD_LENGTH).toBeGreaterThanOrEqual(12);
  });
});

/** Derive a key with the legacy parameters used in the test above. */
async function deriveLegacy(password: string): Promise<string> {
  const { scrypt } = await import("node:crypto");
  const salt = Buffer.from("c2FsdHlzYWx0eXNhbHR5cw==", "base64");
  return new Promise((resolve, reject) => {
    scrypt(
      password.normalize("NFKC"),
      salt,
      32,
      { N: 1024, r: 8, p: 1, maxmem: 256 * 1024 * 8 },
      (err, derived) => (err ? reject(err) : resolve(derived.toString("base64"))),
    );
  });
}
