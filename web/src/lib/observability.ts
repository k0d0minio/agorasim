/**
 * Error tracking — Sentry, server-side only.
 *
 * **Why this exists.** Three paths in this app are designed to fail quietly:
 * a confirmation email that Resend refuses (`lib/email.ts` never throws), a
 * paid Stripe session that matches no booking (the webhook logs "needs a
 * human" and answers 200), and a Neon blip that bakes the shipped fallback
 * catalogue into ISR for an hour (`lib/experience-catalogue.ts`). Each is the
 * right behaviour for the guest in front of the site and the wrong thing to
 * leave in a log nobody reads. This module is the alarm those paths pull.
 *
 * **Server only, by construction.** No Sentry code ships to the browser: there
 * is no `instrumentation-client.ts`, no `withSentryConfig` wrapping the build,
 * and this module carries the `server-only` marker so a client import is a
 * build error. That keeps the public bundle exactly as lean as it was, leaves
 * the Content-Security-Policy untouched (nothing new to `connect-src`), and
 * keeps the privacy policy's "no third-party scripts, no cookies" claims true
 * without a tunnel route to maintain. Unhandled server errors still arrive:
 * `src/instrumentation.ts` hands Next's `onRequestError` to Sentry.
 *
 * **Unconfigured is a supported state.** With no DSN the SDK is never
 * initialised and every capture below returns before touching Sentry — a
 * local checkout, CI, and a preview without the variable behave exactly as
 * before. The two names checked are the ones the Vercel ↔ Sentry integration
 * writes; `SENTRY_DSN` is the one to prefer, since it stays server-side.
 *
 * **What leaves the server.** The error, the tags a caller attached, and — for
 * an unhandled request error — the method, path and headers. `sendDefaultPii`
 * is off, so Sentry derives no IP address and attaches no user, and
 * {@link scrubEvent} strips cookies and credentials from whatever headers do
 * come through. Console breadcrumbs are dropped too: the log lines around a
 * failed send name the guest in the subject, and a breadcrumb is not the
 * place for that. Callers keep the same discipline — a capture carries ids
 * (session, charge, slug), counts and reasons, never a name or an address.
 */
import "server-only";

import * as Sentry from "@sentry/nextjs";
import { after } from "next/server";

/**
 * The part of the system a capture came from — the first thing to filter by
 * in Sentry, and the alert rules' handle. A closed list so a typo in a route
 * does not quietly start a new bucket.
 */
export type CaptureArea = "email" | "stripe" | "stripe-webhook" | "catalogue" | "cron";

export type CaptureContext = {
  area: CaptureArea;
  /** Low-cardinality labels: an event type, a job name, a reason. Never an id. */
  tags?: Record<string, string>;
  /** Anything else worth reading on the event: ids, counts, statuses. */
  extra?: Record<string, unknown>;
  /** `error` unless said otherwise. */
  level?: "fatal" | "error" | "warning";
};

/** How long a capture may hold a serverless invocation open to get out. */
const FLUSH_TIMEOUT_MS = 2_000;

/** Request headers that must never reach Sentry, whatever the integration sends. */
const SECRET_HEADERS = new Set([
  "cookie",
  "set-cookie",
  "authorization",
  "stripe-signature",
  "x-forwarded-for",
  "x-real-ip",
  "x-vercel-forwarded-for",
  "x-vercel-ip-country",
  "x-vercel-ip-city",
]);

/** The DSN, from whichever of the two conventional names is set. */
export function sentryDsn(): string | undefined {
  return (
    process.env.SENTRY_DSN?.trim() || process.env.NEXT_PUBLIC_SENTRY_DSN?.trim() || undefined
  );
}

/** Whether captures go anywhere in this deployment. */
export function isErrorTrackingConfigured(): boolean {
  return Boolean(sentryDsn());
}

/**
 * Drop what must not leave the server, whatever an integration attached.
 *
 * `sendDefaultPii: false` already keeps Sentry from deriving an IP or a user;
 * this is the belt to that braces — headers arrive from `onRequestError`
 * verbatim, and a cookie header on an admin request *is* the operator's
 * session. Exported for its test, and pure: the event goes in, the same event
 * comes out lighter.
 */
export function scrubEvent<T extends Sentry.ErrorEvent>(event: T): T {
  if (event.request?.headers) {
    for (const name of Object.keys(event.request.headers)) {
      if (SECRET_HEADERS.has(name.toLowerCase())) delete event.request.headers[name];
    }
    delete event.request.cookies;
  }
  if (event.user) {
    delete event.user.ip_address;
    delete event.user.email;
    delete event.user.username;
  }
  return event;
}

/**
 * Initialise the SDK for this server process. Called once from
 * `src/instrumentation.ts`; harmless to call again (the SDK checks).
 *
 * Errors only. No `tracesSampleRate` means no spans are ever sampled or sent,
 * so the OpenTelemetry side of the Node SDK does nothing but carry context.
 * `environment` falls out of `VERCEL_ENV` (`vercel-production`,
 * `vercel-preview`) and `release` out of the deployment's commit, both read by
 * the SDK itself; neither needs a variable here.
 */
export function initErrorTracking(): void {
  const dsn = sentryDsn();
  if (!dsn) {
    console.info("[observability] SENTRY_DSN is not set — error tracking is off");
    return;
  }

  Sentry.init({
    dsn,
    sendDefaultPii: false,
    beforeSend: (event) => scrubEvent(event),
    // See the module note: the log lines around a failed send carry the guest's
    // name in the email subject. The event has the tags; it does not need them.
    beforeBreadcrumb: (breadcrumb) => (breadcrumb.category === "console" ? null : breadcrumb),
  });
}

/**
 * Report something that threw. The three silent paths and the route catch
 * blocks call this with the caught value and where it came from.
 */
export function captureError(error: unknown, context: CaptureContext): void {
  if (!isErrorTrackingConfigured()) return;

  Sentry.withScope((scope) => {
    applyContext(scope, context);
    Sentry.captureException(error);
  });
  flushSoon();
}

/**
 * Report a condition that needs a human although nothing threw — a paid
 * session with no booking behind it, a refund on a charge this app never saw.
 * `error` level unless the context says otherwise, because "needs a human" is
 * the whole point.
 */
export function captureAlert(message: string, context: CaptureContext): void {
  if (!isErrorTrackingConfigured()) return;

  Sentry.withScope((scope) => {
    applyContext(scope, context);
    Sentry.captureMessage(message);
  });
  flushSoon();
}

function applyContext(scope: Sentry.Scope, context: CaptureContext): void {
  scope.setLevel(context.level ?? "error");
  scope.setTag("area", context.area);
  for (const [key, value] of Object.entries(context.tags ?? {})) scope.setTag(key, value);
  for (const [key, value] of Object.entries(context.extra ?? {})) scope.setExtra(key, value);
}

/**
 * Make sure the event actually leaves.
 *
 * On Vercel a function can be frozen the moment its response is sent, and the
 * SDK's own `waitUntil` only knows the edge runtime — on Node it is a no-op.
 * Next's `after()` is the platform-aware hook: it holds the invocation open
 * until the flush settles and costs the response nothing. Outside a request
 * scope (a script, a test) `after()` throws, and a best-effort flush is all
 * there is — which is also all there needs to be, since a long-lived process
 * sends in the background anyway.
 */
function flushSoon(): void {
  const flush = () =>
    Sentry.flush(FLUSH_TIMEOUT_MS).then(
      () => undefined,
      () => undefined,
    );
  try {
    after(flush);
  } catch {
    void flush();
  }
}
