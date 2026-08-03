import { describe, expect, it } from "vitest";

import { pickClientIp } from "./request-ip";

/** Build a lookup over a fixed header map, the way a request would present one. */
function headers(map: Record<string, string>) {
  return (name: string) => map[name] ?? null;
}

/**
 * The property under test is precedence, not parsing: a client that can choose
 * its own rate-limit key is not rate-limited. Every case below is written from
 * the attacker's side — "what happens when the caller sends this themselves?"
 */
describe("pickClientIp", () => {
  it("prefers the header only the platform can set", () => {
    const ip = pickClientIp(
      headers({
        "x-vercel-forwarded-for": "203.0.113.7",
        "x-real-ip": "198.51.100.9",
        "x-forwarded-for": "192.0.2.1, 203.0.113.7",
      }),
    );
    expect(ip).toBe("203.0.113.7");
  });

  it("ignores a forged x-forwarded-for when the platform header is present", () => {
    // The bypass this ordering exists to close: spoof the chain, get a fresh
    // throttle bucket per request.
    const ip = pickClientIp(
      headers({
        "x-vercel-forwarded-for": "203.0.113.7",
        "x-forwarded-for": "attacker-chosen-value",
      }),
    );
    expect(ip).toBe("203.0.113.7");
    expect(ip).not.toBe("attacker-chosen-value");
  });

  it("falls back to x-real-ip before the forwarding chain", () => {
    const ip = pickClientIp(
      headers({ "x-real-ip": "198.51.100.9", "x-forwarded-for": "192.0.2.1" }),
    );
    expect(ip).toBe("198.51.100.9");
  });

  it("uses the forwarding chain only when nothing better exists", () => {
    expect(pickClientIp(headers({ "x-forwarded-for": "192.0.2.1, 203.0.113.7" }))).toBe(
      "192.0.2.1",
    );
  });

  it("takes the first hop of a platform chain", () => {
    expect(
      pickClientIp(headers({ "x-vercel-forwarded-for": "203.0.113.7, 198.51.100.9" })),
    ).toBe("203.0.113.7");
  });

  it("trims surrounding whitespace", () => {
    expect(pickClientIp(headers({ "x-real-ip": "  198.51.100.9  " }))).toBe("198.51.100.9");
    expect(pickClientIp(headers({ "x-forwarded-for": " 192.0.2.1 , 203.0.113.7" }))).toBe(
      "192.0.2.1",
    );
  });

  it("shares one bucket rather than disabling the limit", () => {
    // No usable header must throttle harder, never softer: returning something
    // unique per caller here would be a free bypass.
    expect(pickClientIp(headers({}))).toBe("unknown");
    expect(pickClientIp(headers({ "x-forwarded-for": "" }))).toBe("unknown");
    expect(pickClientIp(headers({ "x-forwarded-for": "  ,  " }))).toBe("unknown");
  });
});
