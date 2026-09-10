import * as Sentry from "@sentry/nextjs";

import { initErrorTracking } from "@/lib/observability";

/**
 * Next's instrumentation hook — the one place that runs once per server
 * process before it takes a request, and the one place Next reports errors it
 * caught itself.
 *
 * Both halves are Node-only on purpose. Proxy runs on the Node runtime in this
 * Next version and nothing here opts into the edge, so an edge bundle of this
 * file would be dead code carrying a second SDK; the guard makes sure it stays
 * empty if one is ever built. Everything about *what* is initialised — DSN,
 * PII scrubbing, no tracing — lives in `lib/observability.ts`, next to the
 * captures it serves, so this file is only the wiring.
 */
export function register(): void {
  if (process.env.NEXT_RUNTIME === "nodejs") initErrorTracking();
}

/**
 * Anything a route handler, server component or server action let escape.
 *
 * This is what makes the webhook and the cron routes report *unhandled*
 * failures without wrapping each export: their own `catch` blocks capture the
 * errors they expect, and Next hands the rest — a throw before the `try`, a
 * body that would not parse — to this. Sentry's handler attaches the method,
 * path and headers of the request that failed; `scrubEvent` in
 * `lib/observability.ts` then strips cookies and credentials before it leaves.
 */
export const onRequestError = Sentry.captureRequestError;
