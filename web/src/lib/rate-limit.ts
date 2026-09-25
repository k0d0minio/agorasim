/**
 * Minimal per-key rate limiting (fixed window).
 *
 * Used to throttle the admin login form and five public entry points (tour
 * requests, cancellation/quote link lookups and their actions, the opt-out
 * endpoints). All key on the caller's IP.
 *
 * **Storage.** {@link rateLimitStore} backs onto the `rate_limit_windows` Neon
 * table ({@link createNeonRateLimitStore}) whenever `DATABASE_URL` is set, so a
 * count is shared across every instance; where it isn't (local dev with no
 * database configured) it falls back to {@link createMemoryRateLimitStore},
 * which counts per-instance and resets on cold start. Both implement the same
 * {@link RateLimitStore} interface (one `hit` method), so no caller changes
 * with the store behind it.
 *
 * Keep this module free of `next/*` imports so it stays unit-testable; the
 * request-bound part (reading the client IP) lives in `request-ip.ts`.
 */

import { sql } from "drizzle-orm";
import { db } from "@/db";

export type RateLimitDecision = {
  /** False when the caller has exhausted its allowance for the window. */
  allowed: boolean;
  /** Attempts still available in the current window (0 once blocked). */
  remaining: number;
  /** Whole seconds until the current window rolls over. */
  retryAfterSeconds: number;
};

export type RateLimitRule = {
  /** Maximum number of hits allowed per window. */
  limit: number;
  /** Window length in seconds. */
  windowSeconds: number;
};

export interface RateLimitStore {
  /**
   * Record one hit against `key` and report whether it is allowed. Implementations
   * must count the current hit, so the first call under a `limit` of 5 reports
   * `remaining: 4`.
   */
  hit(key: string, rule: RateLimitRule): Promise<RateLimitDecision>;
}

type Window = { count: number; resetAt: number };

/**
 * In-memory fixed-window store. Expired windows are swept opportunistically on
 * write so the map cannot grow without bound from one-off IPs.
 *
 * `now` is injectable so tests can advance the clock without waiting.
 */
export function createMemoryRateLimitStore(
  now: () => number = Date.now,
): RateLimitStore {
  const windows = new Map<string, Window>();

  function sweep(currentMs: number): void {
    for (const [key, window] of windows) {
      if (window.resetAt <= currentMs) windows.delete(key);
    }
  }

  return {
    async hit(key, { limit, windowSeconds }) {
      const currentMs = now();
      sweep(currentMs);

      const existing = windows.get(key);
      const window: Window =
        existing && existing.resetAt > currentMs
          ? existing
          : { count: 0, resetAt: currentMs + windowSeconds * 1000 };

      window.count += 1;
      windows.set(key, window);

      const retryAfterSeconds = Math.max(
        0,
        Math.ceil((window.resetAt - currentMs) / 1000),
      );

      return {
        allowed: window.count <= limit,
        remaining: Math.max(0, limit - window.count),
        retryAfterSeconds,
      };
    },
  };
}

/**
 * Neon-backed store: one row per key in `rate_limit_windows`, incremented with
 * a single upserting statement so concurrent instances hitting the same key
 * still count correctly (the row lock inside the `ON CONFLICT` update is what
 * makes the increment atomic — there is no read-then-write race).
 *
 * Expiry is opportunistic rather than scheduled: each hit has a small chance
 * of also sweeping windows that closed a while ago, so the table stays small
 * without a cron. `db` defaults to the shared client but takes an override so
 * tests can pass a fake.
 */
export function createNeonRateLimitStore(
  database: Pick<typeof db, "execute"> = db,
): RateLimitStore {
  return {
    async hit(key, { limit, windowSeconds }) {
      const result = await database.execute<{ count: number; reset_at: string }>(sql`
        insert into rate_limit_windows (key, count, reset_at)
        values (${key}, 1, now() + (${windowSeconds}::text || ' seconds')::interval)
        on conflict (key) do update set
          count = case
            when rate_limit_windows.reset_at <= now() then 1
            else rate_limit_windows.count + 1
          end,
          reset_at = case
            when rate_limit_windows.reset_at <= now() then excluded.reset_at
            else rate_limit_windows.reset_at
          end
        returning count, reset_at
      `);
      const row = result.rows[0];
      const resetAt = new Date(row.reset_at).getTime();
      const retryAfterSeconds = Math.max(0, Math.ceil((resetAt - Date.now()) / 1000));

      // ~1 in 200 hits also sweeps windows that closed over a day ago — cheap
      // enough to run inline, and frequent enough that nothing accumulates.
      if (Math.random() < 0.005) {
        await database.execute(
          sql`delete from rate_limit_windows where reset_at < now() - interval '1 day'`,
        );
      }

      return {
        allowed: row.count <= limit,
        remaining: Math.max(0, limit - row.count),
        retryAfterSeconds,
      };
    },
  };
}

/**
 * Process-wide store used by the server actions: the Neon-backed store once a
 * database is configured, the in-memory one otherwise (local dev with no
 * `DATABASE_URL`). Read once at module load — `DATABASE_URL`'s presence is
 * deployment configuration, not something that changes mid-process.
 */
export const rateLimitStore: RateLimitStore = process.env.DATABASE_URL
  ? createNeonRateLimitStore()
  : createMemoryRateLimitStore();

/**
 * Admin login: 5 attempts per IP per 15 minutes — tighter than the 8 this
 * repo started with, now that the count survives across instances instead of
 * resetting on the next cold start.
 */
export const LOGIN_RATE_LIMIT: RateLimitRule = {
  limit: 5,
  windowSeconds: 15 * 60,
};

/**
 * Public tour-request form: 8 submissions per IP per 10 minutes. Counted on
 * entry, before validation, so the allowance has to leave room for a few
 * genuine mistakes (bad email, missing name) as well as the real submission.
 */
export const TOUR_REQUEST_RATE_LIMIT: RateLimitRule = {
  limit: 8,
  windowSeconds: 10 * 60,
};

/**
 * The guest's cancel link, on the way in: 20 lookups per IP per 10 minutes.
 *
 * This is the page load, not the cancellation. It is looser than the forms
 * above because a genuine guest reloads a link their mail client may have
 * prefetched, opens it on a phone and again on a laptop, and comes back to read
 * the deadline — while what it is defending against is somebody walking the
 * token space, and 32 bytes of entropy makes that hopeless long before a rate
 * limit does (`lib/cancellation-token.ts`). The limit is here so a walk costs a
 * database round-trip per attempt instead of none.
 */
export const CANCELLATION_LOOKUP_RATE_LIMIT: RateLimitRule = {
  limit: 20,
  windowSeconds: 10 * 60,
};

/**
 * Pressing the button: 5 cancellations per IP per 10 minutes.
 *
 * Tight, because on the other side of it is a Stripe refund. Nobody legitimate
 * cancels five bookings from one address in ten minutes, and the confirmation
 * step means a real guest spends exactly one of these.
 */
export const CANCELLATION_RATE_LIMIT: RateLimitRule = {
  limit: 5,
  windowSeconds: 10 * 60,
};

/**
 * The couple's quote link, on the way in: 20 lookups per IP per 10 minutes —
 * the cancel link's reasoning exactly (`CANCELLATION_LOOKUP_RATE_LIMIT`): a
 * real couple reload and share the link, and 32 bytes of token make a walk
 * hopeless anyway. The limit makes a walk cost a request, not a query.
 */
export const QUOTE_LOOKUP_RATE_LIMIT: RateLimitRule = {
  limit: 20,
  windowSeconds: 10 * 60,
};

/**
 * The quote page's pay button: 10 taps per IP per 10 minutes.
 *
 * Each tap may mint a Stripe session, so it is tighter than the lookup; a
 * couple who changes their mind at Stripe and comes back, twice, spends
 * three of these.
 */
export const QUOTE_PAY_RATE_LIMIT: RateLimitRule = {
  limit: 10,
  windowSeconds: 10 * 60,
};

/**
 * The thank-you's opt-out link and its one-click endpoint: 20 per IP per 10
 * minutes. A real guest presses once; a mail client's one-click POST comes
 * from the provider's own address, a handful at a time. The limit makes a
 * walk over tokens cost a rejected request rather than an HMAC and a query.
 */
export const OPT_OUT_RATE_LIMIT: RateLimitRule = {
  limit: 20,
  windowSeconds: 10 * 60,
};

/**
 * The RFC 8058 one-click endpoint, on its own key: those POSTs come from the
 * mailbox provider's servers — a small pool of IPs carrying every guest who
 * pressed Gmail's "Unsubscribe" — not from the guest, and a provider does not
 * retry a refused one. So the limit is sized for a provider's burst, and a
 * throttled objection is never the guest's own doing. The token is verified
 * (one HMAC) before anything touches the database either way.
 */
export const OPT_OUT_ONE_CLICK_RATE_LIMIT: RateLimitRule = {
  limit: 300,
  windowSeconds: 10 * 60,
};

/** Record a hit against the shared store. */
export function rateLimit(
  key: string,
  rule: RateLimitRule,
): Promise<RateLimitDecision> {
  return rateLimitStore.hit(key, rule);
}
