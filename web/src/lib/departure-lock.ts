/**
 * One writer per departure — the lock between the capacity check and the write.
 *
 * Every path that takes room on a departure reads what is free
 * (`checkSlotAvailable` in `lib/availability.ts`) and then writes the booking
 * that takes it. Those are two statements, and on their own two guests paying
 * for the last seat in the same second both read it free and both write a
 * booking: the departure ends over its seats or over its drivers. So each path
 * runs its check and its write inside {@link withDepartureLock}, and a second
 * writer for the same date and slot waits until the first has written, then
 * reads a departure that already counts it.
 *
 * **A transaction advisory lock, on a connection of its own.** `db`
 * (`db/index.ts`) is Neon's HTTP driver: every query is its own request and
 * there is no transaction to hold a lock in. This module opens one WebSocket
 * connection per call (Neon's `Client`, from the driver `db` already depends
 * on), takes `pg_advisory_xact_lock` on a key from the date and the slot, runs
 * the caller, and commits — which is the release. Per call, never pooled: a
 * WebSocket must not outlive the serverless invocation that opened it.
 *
 * **The lock holds; the reads and writes stay where they are.** The caller
 * goes on using `db`. Each of its writes commits as it returns, so by the time
 * this connection commits and the next writer's lock is granted, everything
 * the first writer did is visible to the second's check — on any connection.
 * Nothing about the check or the write has to know it is locked.
 *
 * **A wait is bounded.** `lock_timeout` stops a writer queued behind a stuck
 * one after {@link LOCK_WAIT_MS}; the call throws, and each caller already
 * turns a throw into "try again". A connection that dies releases its lock
 * with it — the transaction ends with the socket.
 */
import "server-only";

import { Client } from "@neondatabase/serverless";

/** How long a writer waits for the departure before it gives up. */
export const LOCK_WAIT_MS = 10_000;

/**
 * The text the lock key is hashed from. One departure is one date and one
 * slot, whatever the tour: the drivers and the cars are shared across routes,
 * so two tours on the same 10:00 compete for the same pool.
 */
export function departureLockKey(date: string, slot: string): string {
  return `departure:${date}:${slot}`;
}

/**
 * Run `run` while holding the departure `date`/`slot` against every other
 * writer that asks for it. Resolves with what `run` resolves with. Throws when
 * the database cannot be reached, when the wait runs out, or when `run`
 * throws — in which case the lock is released all the same.
 */
export async function withDepartureLock<T>(
  date: string,
  slot: string,
  run: () => Promise<T>,
): Promise<T> {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set — the departure cannot be locked.");
  }

  const client = new Client(url);
  await client.connect();
  try {
    await client.query("BEGIN");
    await client.query(`SET LOCAL lock_timeout = ${LOCK_WAIT_MS}`);
    // `hashtextextended` folds the key into the bigint the lock takes. A
    // collision between two departures only makes one wait for the other.
    await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [
      departureLockKey(date, slot),
    ]);

    let result: T;
    try {
      result = await run();
    } catch (err) {
      await client.query("ROLLBACK").catch(() => undefined);
      throw err;
    }
    // `run`'s writes have already committed on their own. A commit that fails
    // here must not report them as failed; closing the connection below
    // releases the lock either way.
    await client.query("COMMIT").catch(() => undefined);
    return result;
  } finally {
    await client.end().catch(() => undefined);
  }
}
