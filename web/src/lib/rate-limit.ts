/**
 * Minimal per-key rate limiting (fixed window).
 *
 * Used to throttle the two unauthenticated entry points into the app: the admin
 * login form and the public tour-request form. Both key on the caller's IP.
 *
 * **Storage.** There is no shared store in this deployment today — no Vercel KV,
 * no Upstash Redis, no Redis add-on — so the default implementation keeps
 * counters in module memory. That is per-instance and resets on cold start, so
 * on a serverless platform it throttles a burst from one attacker hitting one
 * instance but not a slow attack spread across instances. It is deliberately
 * hidden behind {@link RateLimitStore}: when a real store is provisioned, add an
 * implementation of that interface (one `hit` method) and swap the value of
 * {@link rateLimitStore} — no caller changes.
 *
 * Keep this module free of `next/*` imports so it stays unit-testable; the
 * request-bound part (reading the client IP) lives in `request-ip.ts`.
 */

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
 * Process-wide store used by the server actions. Swap this for a KV/Redis-backed
 * {@link RateLimitStore} once one is available in the deployment.
 */
export const rateLimitStore: RateLimitStore = createMemoryRateLimitStore();

/** Admin login: 8 attempts per IP per 15 minutes. */
export const LOGIN_RATE_LIMIT: RateLimitRule = {
  limit: 8,
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

/** Record a hit against the shared store. */
export function rateLimit(
  key: string,
  rule: RateLimitRule,
): Promise<RateLimitDecision> {
  return rateLimitStore.hit(key, rule);
}
