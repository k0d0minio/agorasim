import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The departure lock against a stand-in Postgres: `pg_advisory_xact_lock`
 * waits while another open transaction holds the same key, and COMMIT,
 * ROLLBACK or a closed connection lets the next one in — what the real
 * server does. The race the lock exists for is replayed on top of it: two
 * checkouts for the last seat of one departure, in the same second.
 */

// ---------------------------------------------------------------------------
// The server: advisory locks by key, and every statement each connection sent.
// ---------------------------------------------------------------------------

const holders = new Map<string, { release: Promise<void> }>();
const statements: string[][] = [];
let connectFails = false;

class FakeClient {
  private sent: string[] = [];
  private held: { key: string; free: () => void } | null = null;

  constructor(readonly url: string) {
    statements.push(this.sent);
  }

  async connect() {
    if (connectFails) throw new Error("connection refused");
  }

  async query(text: string, params?: unknown[]) {
    this.sent.push(text);
    if (text.startsWith("SELECT pg_advisory_xact_lock")) {
      const key = String(params?.[0]);
      while (holders.has(key)) await holders.get(key)!.release;
      let free!: () => void;
      holders.set(key, { release: new Promise<void>((resolve) => (free = resolve)) });
      this.held = { key, free };
    }
    if (text === "COMMIT" || text === "ROLLBACK") this.unlock();
    return { rows: [] };
  }

  async end() {
    this.unlock();
  }

  private unlock() {
    if (!this.held) return;
    holders.delete(this.held.key);
    this.held.free();
    this.held = null;
  }
}

vi.mock("@neondatabase/serverless", () => ({ Client: FakeClient }));

const { departureLockKey, withDepartureLock } = await import("./departure-lock");

beforeEach(() => {
  holders.clear();
  statements.length = 0;
  connectFails = false;
  vi.stubEnv("DATABASE_URL", "postgres://test");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

/** Let every pending promise run, so "in the same second" really overlaps. */
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

// ---------------------------------------------------------------------------
// The race: one seat, two guests.
// ---------------------------------------------------------------------------

/**
 * A departure with one free seat, and the check-then-write every booking path
 * does: read the seats taken, yield (the round trip to the database), write a
 * booking if one is still free.
 */
function lastSeat() {
  const booked: string[] = [];
  const checkout = async (guest: string) => {
    const free = 1 - booked.length;
    await tick();
    if (free < 1) return "refused";
    booked.push(guest);
    return "booked";
  };
  return { booked, checkout };
}

describe("two checkouts for the last seat in the same second", () => {
  it("both book without the lock — the fault this module fixes", async () => {
    const { booked, checkout } = lastSeat();

    const results = await Promise.all([checkout("ana"), checkout("rui")]);

    expect(results).toEqual(["booked", "booked"]);
    expect(booked).toHaveLength(2);
  });

  it("give one booking and one refusal under the lock", async () => {
    const { booked, checkout } = lastSeat();

    const results = await Promise.all([
      withDepartureLock("2026-11-14", "morning", () => checkout("ana")),
      withDepartureLock("2026-11-14", "morning", () => checkout("rui")),
    ]);

    expect(results.sort()).toEqual(["booked", "refused"]);
    expect(booked).toHaveLength(1);
  });

  it("do not wait on each other on two different departures", async () => {
    const order: string[] = [];
    const slow = async (name: string) => {
      order.push(`${name}:start`);
      await tick();
      order.push(`${name}:end`);
    };

    await Promise.all([
      withDepartureLock("2026-11-14", "morning", () => slow("morning")),
      withDepartureLock("2026-11-14", "afternoon", () => slow("afternoon")),
    ]);

    // Both started before either ended: no departure held the other up.
    expect(order.slice(0, 2).sort()).toEqual(["afternoon:start", "morning:start"]);
  });
});

// ---------------------------------------------------------------------------
// The transaction around the caller.
// ---------------------------------------------------------------------------

describe("withDepartureLock", () => {
  it("locks the departure in a transaction with a bounded wait, then commits", async () => {
    await expect(withDepartureLock("2026-11-14", "morning", async () => 42)).resolves.toBe(42);

    expect(statements).toHaveLength(1);
    expect(statements[0]).toEqual([
      "BEGIN",
      "SET LOCAL lock_timeout = 10000",
      "SELECT pg_advisory_xact_lock(hashtextextended($1, 0))",
      "COMMIT",
    ]);
  });

  it("rolls back and lets the next writer in when the caller throws", async () => {
    await expect(
      withDepartureLock("2026-11-14", "morning", async () => {
        throw new Error("insert failed");
      }),
    ).rejects.toThrow("insert failed");
    expect(statements[0]).toContain("ROLLBACK");

    // The departure is free again: this would hang if the lock had stayed held.
    await expect(withDepartureLock("2026-11-14", "morning", async () => "next")).resolves.toBe(
      "next",
    );
  });

  it("throws, and runs nothing, when the database cannot be reached", async () => {
    connectFails = true;
    const run = vi.fn();

    await expect(withDepartureLock("2026-11-14", "morning", run)).rejects.toThrow(
      "connection refused",
    );
    expect(run).not.toHaveBeenCalled();
  });

  it("throws, and runs nothing, without DATABASE_URL", async () => {
    vi.stubEnv("DATABASE_URL", "");
    const run = vi.fn();

    await expect(withDepartureLock("2026-11-14", "morning", run)).rejects.toThrow(
      /DATABASE_URL/,
    );
    expect(run).not.toHaveBeenCalled();
  });

  it("keys one departure by its date and slot, whatever the tour", () => {
    expect(departureLockKey("2026-11-14", "morning")).toBe("departure:2026-11-14:morning");
    expect(departureLockKey("2026-11-14", "morning")).not.toBe(
      departureLockKey("2026-11-14", "afternoon"),
    );
  });
});
