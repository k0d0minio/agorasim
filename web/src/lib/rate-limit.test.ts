import { afterEach, describe, expect, it, vi } from "vitest";
import { createMemoryRateLimitStore, createNeonRateLimitStore } from "./rate-limit";

/** Matches `createNeonRateLimitStore`'s `database` parameter type. */
type NeonDatabase = Parameters<typeof createNeonRateLimitStore>[0];

const RULE = { limit: 3, windowSeconds: 60 };

// ---------------------------------------------------------------------------
// A fake Neon table for `createNeonRateLimitStore`. It reads the params off
// the drizzle `sql` template (`queryChunks`: alternating raw-text chunks and
// interpolated values) and applies the same upsert-or-sweep semantics the
// real migration's SQL does, against one `Map` — so two store instances
// pointed at the same fake reproduce what two serverless instances sharing
// one Neon table would see, without a live database.
// ---------------------------------------------------------------------------

type QueryChunk = { value: string[] } | unknown;

function planQuery(query: { queryChunks: QueryChunk[] }): {
  text: string;
  params: unknown[];
} {
  let text = "";
  const params: unknown[] = [];
  for (const chunk of query.queryChunks) {
    if (chunk && typeof chunk === "object" && "value" in (chunk as { value: unknown })) {
      text += (chunk as { value: string[] }).value.join("");
    } else {
      params.push(chunk);
    }
  }
  return { text, params };
}

function createFakeNeonDatabase(now: () => number): NeonDatabase & {
  _table: Map<string, { count: number; resetAt: number }>;
} {
  const table = new Map<string, { count: number; resetAt: number }>();

  async function execute(query: unknown) {
    const { text, params } = planQuery(query as { queryChunks: QueryChunk[] });

    if (text.includes("insert into rate_limit_windows")) {
      const [key, windowSeconds] = params as [string, number];
      const nowMs = now();
      const existing = table.get(key);
      const row =
        existing && existing.resetAt > nowMs
          ? { count: existing.count + 1, resetAt: existing.resetAt }
          : { count: 1, resetAt: nowMs + windowSeconds * 1000 };
      table.set(key, row);
      return { rows: [{ count: row.count, reset_at: new Date(row.resetAt).toISOString() }] };
    }

    if (text.includes("delete from rate_limit_windows")) {
      const cutoff = now() - 24 * 60 * 60 * 1000;
      for (const [key, row] of table) {
        if (row.resetAt < cutoff) table.delete(key);
      }
      return { rows: [] };
    }

    throw new Error(`unexpected query in fake Neon database: ${text}`);
  }

  return { execute, _table: table } as NeonDatabase & {
    _table: Map<string, { count: number; resetAt: number }>;
  };
}

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

describe("createNeonRateLimitStore", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("allows hits up to the limit and counts down the remainder", async () => {
    const database = createFakeNeonDatabase(() => 0);
    const store = createNeonRateLimitStore(database);

    expect(await store.hit("ip", RULE)).toMatchObject({ allowed: true, remaining: 2 });
    expect(await store.hit("ip", RULE)).toMatchObject({ allowed: true, remaining: 1 });
    expect(await store.hit("ip", RULE)).toMatchObject({ allowed: true, remaining: 0 });
  });

  it("blocks once the limit is exceeded", async () => {
    const database = createFakeNeonDatabase(() => 0);
    const store = createNeonRateLimitStore(database);
    for (let i = 0; i < RULE.limit; i++) await store.hit("ip", RULE);

    const blocked = await store.hit("ip", RULE);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
  });

  it("starts a fresh window once the old one has elapsed", async () => {
    let now = 0;
    const database = createFakeNeonDatabase(() => now);
    const store = createNeonRateLimitStore(database);

    for (let i = 0; i < RULE.limit; i++) await store.hit("ip", RULE);
    expect((await store.hit("ip", RULE)).allowed).toBe(false);

    now += RULE.windowSeconds * 1000;
    expect(await store.hit("ip", RULE)).toMatchObject({ allowed: true, remaining: 2 });
  });

  it("shares one window across store instances backed by the same database — the point of moving off module memory", async () => {
    const database = createFakeNeonDatabase(() => 0);
    // Two independent stores, standing in for two serverless instances that
    // never share process memory but do share the Neon table.
    const instanceA = createNeonRateLimitStore(database);
    const instanceB = createNeonRateLimitStore(database);

    await instanceA.hit("ip", RULE);
    await instanceB.hit("ip", RULE);
    const third = await instanceA.hit("ip", RULE);
    expect(third).toMatchObject({ allowed: true, remaining: 0 });

    // A fourth hit, from either instance, is the one the in-memory store
    // would have missed had it landed on a fresh, uncounted instance.
    const fourth = await instanceB.hit("ip", RULE);
    expect(fourth.allowed).toBe(false);
  });

  it("keys separately, so one caller cannot lock another out", async () => {
    const database = createFakeNeonDatabase(() => 0);
    const store = createNeonRateLimitStore(database);
    for (let i = 0; i < RULE.limit + 2; i++) await store.hit("noisy", RULE);

    expect(await store.hit("quiet", RULE)).toMatchObject({ allowed: true, remaining: 2 });
  });

  it("sweeps windows that closed over a day ago on the rare hit that rolls the dice", async () => {
    let now = 0;
    const database = createFakeNeonDatabase(() => now);
    const store = createNeonRateLimitStore(database);

    await store.hit("stale", RULE);
    expect(database._table.has("stale")).toBe(true);

    now += 25 * 60 * 60 * 1000; // a day and an hour later
    vi.spyOn(Math, "random").mockReturnValue(0); // forces the sweep branch
    await store.hit("fresh", RULE);

    expect(database._table.has("stale")).toBe(false);
    expect(database._table.has("fresh")).toBe(true);
  });
});
