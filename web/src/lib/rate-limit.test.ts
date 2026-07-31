import { describe, expect, it } from "vitest";
import { createMemoryRateLimitStore } from "./rate-limit";

const RULE = { limit: 3, windowSeconds: 60 };

describe("createMemoryRateLimitStore", () => {
  it("allows hits up to the limit and counts down the remainder", async () => {
    const store = createMemoryRateLimitStore(() => 0);

    expect(await store.hit("ip", RULE)).toMatchObject({ allowed: true, remaining: 2 });
    expect(await store.hit("ip", RULE)).toMatchObject({ allowed: true, remaining: 1 });
    expect(await store.hit("ip", RULE)).toMatchObject({ allowed: true, remaining: 0 });
  });

  it("blocks once the limit is exceeded", async () => {
    const store = createMemoryRateLimitStore(() => 0);
    for (let i = 0; i < RULE.limit; i++) await store.hit("ip", RULE);

    const blocked = await store.hit("ip", RULE);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.retryAfterSeconds).toBe(60);
  });

  it("keys separately, so one caller cannot lock another out", async () => {
    const store = createMemoryRateLimitStore(() => 0);
    for (let i = 0; i < RULE.limit + 2; i++) await store.hit("noisy", RULE);

    expect(await store.hit("quiet", RULE)).toMatchObject({ allowed: true, remaining: 2 });
  });

  it("starts a fresh window once the old one has elapsed", async () => {
    let now = 0;
    const store = createMemoryRateLimitStore(() => now);

    for (let i = 0; i < RULE.limit; i++) await store.hit("ip", RULE);
    expect((await store.hit("ip", RULE)).allowed).toBe(false);

    now += RULE.windowSeconds * 1000;
    expect(await store.hit("ip", RULE)).toMatchObject({ allowed: true, remaining: 2 });
  });

  it("counts down retryAfterSeconds as the window drains", async () => {
    let now = 0;
    const store = createMemoryRateLimitStore(() => now);

    expect((await store.hit("ip", RULE)).retryAfterSeconds).toBe(60);
    now += 45_000;
    expect((await store.hit("ip", RULE)).retryAfterSeconds).toBe(15);
  });
});
