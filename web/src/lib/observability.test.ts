import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ErrorEvent } from "@sentry/nextjs";

/**
 * The capture helper the silent paths pull. Two properties matter more than
 * any other:
 *
 * 1. **Without a DSN it does nothing at all** — not "initialises and drops",
 *    but never touches the SDK. CI, a local checkout and a preview without the
 *    variable have to behave exactly as they did before this module existed.
 * 2. **With one, what leaves is what the caller said and no more.** The area
 *    and tags arrive so alerts can be routed; cookies, credentials and IPs do
 *    not, whatever an integration attached.
 *
 * Sentry itself is a stand-in: whether its transport works is its own
 * business, and what is asserted is which calls it gets. `next/server` is
 * replaced too, so the flush can be seen to go through `after()` — the hook
 * that keeps a Vercel invocation alive long enough for the event to leave.
 */

const sentry = vi.hoisted(() => {
  const scope = { setLevel: vi.fn(), setTag: vi.fn(), setExtra: vi.fn() };
  return {
    scope,
    init: vi.fn(),
    withScope: vi.fn((run: (scope: unknown) => void) => run(scope)),
    captureException: vi.fn(),
    captureMessage: vi.fn(),
    flush: vi.fn(() => Promise.resolve(true)),
  };
});

vi.mock("@sentry/nextjs", () => ({
  init: sentry.init,
  withScope: sentry.withScope,
  captureException: sentry.captureException,
  captureMessage: sentry.captureMessage,
  flush: sentry.flush,
}));

const nextServer = vi.hoisted(() => ({
  after: vi.fn((task: () => unknown) => {
    void task();
  }),
}));

vi.mock("next/server", () => ({ after: nextServer.after }));

const {
  captureAlert,
  captureError,
  initErrorTracking,
  isErrorTrackingConfigured,
  scrubEvent,
  sentryDsn,
} = await import("./observability");

const DSN = "https://public@o0.ingest.sentry.io/0";

const originalEnv = {
  SENTRY_DSN: process.env.SENTRY_DSN,
  NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
};

beforeEach(() => {
  vi.clearAllMocks();
  delete process.env.SENTRY_DSN;
  delete process.env.NEXT_PUBLIC_SENTRY_DSN;
});

afterEach(() => {
  for (const [name, value] of Object.entries(originalEnv)) {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
});

/** Sentry's `init` options as the module passed them, typed loosely on purpose. */
function initOptions(): {
  dsn?: string;
  sendDefaultPii?: boolean;
  beforeSend?: (event: ErrorEvent) => ErrorEvent | null;
  beforeBreadcrumb?: (breadcrumb: { category?: string }) => unknown;
} {
  return sentry.init.mock.calls[0]?.[0] as ReturnType<typeof initOptions>;
}

describe("without a DSN", () => {
  it("reports itself off", () => {
    expect(sentryDsn()).toBeUndefined();
    expect(isErrorTrackingConfigured()).toBe(false);
  });

  it("never initialises the SDK, and says so once in the log", () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});

    initErrorTracking();

    expect(sentry.init).not.toHaveBeenCalled();
    expect(info).toHaveBeenCalledTimes(1);
  });

  it("makes every capture a no-op — no scope, no event, no flush", () => {
    captureError(new Error("nobody hears this"), { area: "email" });
    captureAlert("nor this", { area: "stripe-webhook" });

    expect(sentry.withScope).not.toHaveBeenCalled();
    expect(sentry.captureException).not.toHaveBeenCalled();
    expect(sentry.captureMessage).not.toHaveBeenCalled();
    expect(sentry.flush).not.toHaveBeenCalled();
    expect(nextServer.after).not.toHaveBeenCalled();
  });
});

describe("the DSN", () => {
  it("is read from SENTRY_DSN first", () => {
    process.env.SENTRY_DSN = DSN;
    process.env.NEXT_PUBLIC_SENTRY_DSN = "https://other@o0.ingest.sentry.io/1";

    expect(sentryDsn()).toBe(DSN);
    expect(isErrorTrackingConfigured()).toBe(true);
  });

  it("falls back to the name the Vercel integration writes", () => {
    process.env.NEXT_PUBLIC_SENTRY_DSN = DSN;

    expect(sentryDsn()).toBe(DSN);
  });

  it("treats whitespace as unset", () => {
    process.env.SENTRY_DSN = "   ";

    expect(sentryDsn()).toBeUndefined();
    expect(isErrorTrackingConfigured()).toBe(false);
  });
});

describe("with a DSN", () => {
  beforeEach(() => {
    process.env.SENTRY_DSN = DSN;
  });

  it("captures an error with its area, tags, extra and level on the scope", () => {
    const err = new Error("Resend is having a day");

    captureError(err, {
      area: "email",
      tags: { reason: "network" },
      extra: { recipients: 2 },
    });

    expect(sentry.captureException).toHaveBeenCalledWith(err);
    expect(sentry.scope.setTag).toHaveBeenCalledWith("area", "email");
    expect(sentry.scope.setTag).toHaveBeenCalledWith("reason", "network");
    expect(sentry.scope.setExtra).toHaveBeenCalledWith("recipients", 2);
    // `error` unless the caller says otherwise: these are alarms.
    expect(sentry.scope.setLevel).toHaveBeenCalledWith("error");
  });

  it("sends an alert as a message, at the level the caller chose", () => {
    captureAlert("paid session matches no booking", {
      area: "stripe-webhook",
      level: "warning",
      tags: { outcome: "unknown-session" },
    });

    expect(sentry.captureMessage).toHaveBeenCalledWith("paid session matches no booking");
    expect(sentry.captureException).not.toHaveBeenCalled();
    expect(sentry.scope.setLevel).toHaveBeenCalledWith("warning");
    expect(sentry.scope.setTag).toHaveBeenCalledWith("area", "stripe-webhook");
    expect(sentry.scope.setTag).toHaveBeenCalledWith("outcome", "unknown-session");
  });

  it("flushes through after(), so a serverless invocation waits for the event", () => {
    captureError(new Error("boom"), { area: "cron" });

    expect(nextServer.after).toHaveBeenCalledTimes(1);
    expect(sentry.flush).toHaveBeenCalledTimes(1);
    expect(sentry.flush).toHaveBeenCalledWith(expect.any(Number));
  });

  it("still flushes, best-effort, when there is no request scope for after()", () => {
    // Exactly what Next throws from a script or a test.
    nextServer.after.mockImplementationOnce(() => {
      throw new Error("`after` was called outside a request scope.");
    });

    expect(() => captureError(new Error("boom"), { area: "catalogue" })).not.toThrow();
    expect(sentry.flush).toHaveBeenCalledTimes(1);
  });

  it("never lets a failed flush surface to the caller", async () => {
    sentry.flush.mockRejectedValueOnce(new Error("transport down"));

    expect(() => captureError(new Error("boom"), { area: "catalogue" })).not.toThrow();
    // The rejection is swallowed inside the scheduled task.
    await expect(nextServer.after.mock.calls[0]?.[0]()).resolves.toBeUndefined();
  });

  it("initialises errors-only, without default PII, and scrubs on the way out", () => {
    initErrorTracking();

    expect(sentry.init).toHaveBeenCalledTimes(1);
    const options = initOptions();
    expect(options.dsn).toBe(DSN);
    expect(options.sendDefaultPii).toBe(false);
    // No tracing option at all: no spans are ever sampled, let alone sent.
    expect(options).not.toHaveProperty("tracesSampleRate");
    expect(options).not.toHaveProperty("tracesSampler");

    const event = {
      request: { headers: { cookie: "admin_session=secret", "user-agent": "ua" } },
    } as unknown as ErrorEvent;
    expect(options.beforeSend?.(event)?.request?.headers).toEqual({ "user-agent": "ua" });
  });

  it("drops console breadcrumbs, which carry guest names from the email log lines", () => {
    initErrorTracking();
    const { beforeBreadcrumb } = initOptions();

    expect(beforeBreadcrumb?.({ category: "console" })).toBeNull();
    // Anything else — an outgoing HTTP call, say — is context worth keeping.
    expect(beforeBreadcrumb?.({ category: "http" })).toEqual({ category: "http" });
  });
});

describe("scrubEvent", () => {
  it("strips cookies, credentials and client-address headers, and keeps the rest", () => {
    const event = {
      request: {
        method: "POST",
        headers: {
          Cookie: "admin_session=secret",
          authorization: "Bearer cron-secret",
          "stripe-signature": "t=1,v1=abc",
          "x-forwarded-for": "203.0.113.9",
          "x-real-ip": "203.0.113.9",
          "user-agent": "Stripe/1.0",
          "content-type": "application/json",
        },
        cookies: { admin_session: "secret" },
      },
      user: { id: "operator-1", ip_address: "203.0.113.9", email: "ops@example.com" },
    } as unknown as ErrorEvent;

    const scrubbed = scrubEvent(event);

    expect(scrubbed.request?.headers).toEqual({
      "user-agent": "Stripe/1.0",
      "content-type": "application/json",
    });
    expect(scrubbed.request).not.toHaveProperty("cookies");
    expect(scrubbed.user).toEqual({ id: "operator-1" });
  });

  it("leaves an event with no request or user alone", () => {
    const event = { message: "hello" } as unknown as ErrorEvent;

    expect(scrubEvent(event)).toEqual({ message: "hello" });
  });
});
