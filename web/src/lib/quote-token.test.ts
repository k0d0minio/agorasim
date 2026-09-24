import { afterEach, describe, expect, it, vi } from "vitest";

import { cancellationTokenDigest } from "./cancellation-token";
import {
  issueQuoteToken,
  looksLikeQuoteToken,
  quotePath,
  quoteTokenDigest,
} from "./quote-token";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("issueQuoteToken", () => {
  it("mints a link-shaped token whose digest is the one stored", async () => {
    const { token, digest } = await issueQuoteToken();

    expect(looksLikeQuoteToken(token)).toBe(true);
    expect(digest).toBe(await quoteTokenDigest(token));
  });

  it("gives every send a different link", async () => {
    const issued = await Promise.all(Array.from({ length: 16 }, () => issueQuoteToken()));

    expect(new Set(issued.map((entry) => entry.digest)).size).toBe(issued.length);
  });

  it("refuses to mint without the secret — fails closed", async () => {
    vi.stubEnv("BOOKING_TOKEN_SECRET", "");

    await expect(issueQuoteToken()).rejects.toThrow(/BOOKING_TOKEN_SECRET/);
  });
});

describe("quoteTokenDigest", () => {
  // Same key, different domain: a quote link pasted into the cancel route must
  // digest to something no booking holds.
  it("never equals the cancel-link digest of the same token", async () => {
    const { token } = await issueQuoteToken();

    expect(await quoteTokenDigest(token)).not.toBe(await cancellationTokenDigest(token));
  });
});

describe("quotePath", () => {
  it("puts the token in the path of the locale's quote page", () => {
    expect(quotePath("pt", "abc")).toBe("/pt/orcamento/abc");
    expect(quotePath("en", "abc")).toBe("/en/orcamento/abc");
  });
});
