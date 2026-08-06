import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import { ADMIN_SESSION_COOKIE, createSessionToken } from "@/lib/admin-session";
import { proxy } from "./proxy";

/**
 * What the proxy does to a request, by method.
 *
 * The behavioural rule these cover is not obvious from reading the function, so
 * it is worth stating: **a request that carries a body must never be answered
 * with a method-preserving redirect.** 307 and 308 keep the method, so the
 * browser re-POSTs the same body at `/admin/login` — and for a Server Action
 * that means the action id lands on a page that has never heard of it, the
 * response is HTML rather than a flight payload, and Next's client throws
 * *"An unexpected response was received from the server."*
 *
 * The symptom was an operator being dropped on the login screen behind an error
 * page after every interaction, which reads as "the admin keeps signing me out"
 * and not at all as "the proxy redirected a POST".
 */
const ORIGIN = "https://agorasim.pt";

function request(
  path: string,
  { method = "GET", cookie, action }: { method?: string; cookie?: string; action?: boolean } = {},
): NextRequest {
  const headers = new Headers();
  if (cookie) headers.set("cookie", `${ADMIN_SESSION_COOKIE}=${cookie}`);
  if (action) headers.set("next-action", "0123456789abcdef");
  return new NextRequest(new URL(path, ORIGIN), { method, headers });
}

/** A token the proxy will accept: correctly signed and unexpired. */
function validToken(): Promise<string> {
  return createSessionToken("11111111-2222-3333-4444-555555555555");
}

describe("proxy — signed out", () => {
  it("redirects a navigation to the login screen, remembering the path", async () => {
    const response = await proxy(request("/admin/sales"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      `${ORIGIN}/admin/login?next=%2Fadmin%2Fsales`,
    );
  });

  it("redirects the dashboard without a redundant `next`", async () => {
    const response = await proxy(request("/admin"));

    expect(response.headers.get("location")).toBe(`${ORIGIN}/admin/login`);
  });

  it("lets a Server Action through rather than redirecting it", async () => {
    // Redirecting this is the bug: the browser would re-POST the action body at
    // the login screen. It is safe to pass on — every action calls
    // `requireAdmin()` itself, which `authorization.test.ts` enforces.
    const response = await proxy(request("/admin/sales", { method: "POST", action: true }));

    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  });

  it("redirects a body-carrying non-action POST with 303, never 307", async () => {
    // A form post without JavaScript. There is no action id in a header to
    // recognise, so it is turned away — but with a status that tells the
    // browser to GET the login screen instead of re-sending the body at it.
    const response = await proxy(request("/admin/sales", { method: "POST" }));

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(
      `${ORIGIN}/admin/login?next=%2Fadmin%2Fsales`,
    );
  });

  it("keeps the login screen reachable", async () => {
    const response = await proxy(request("/admin/login"));

    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  });

  it("says why it turned a request away, without logging the token", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    await proxy(request("/admin/sales"));
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("no session cookie"));

    warn.mockClear();
    await proxy(request("/admin/sales", { cookie: "tampered.token" }));
    const [message] = warn.mock.calls[0] as [string];
    expect(message).toContain("invalid or expired");
    expect(message).not.toContain("tampered");

    warn.mockRestore();
  });
});

describe("proxy — signed in", () => {
  it("lets a navigation through", async () => {
    const response = await proxy(request("/admin/sales", { cookie: await validToken() }));

    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  });

  it("lets a Server Action through", async () => {
    const response = await proxy(
      request("/admin/sales", { method: "POST", action: true, cookie: await validToken() }),
    );

    expect(response.status).toBe(200);
  });

  it("rejects a token signed with someone else's secret", async () => {
    const [payload] = (await validToken()).split(".");

    const response = await proxy(request("/admin/sales", { cookie: `${payload}.forged` }));
    expect(response.status).toBe(307);
  });
});

describe("proxy — content security policy", () => {
  it("attaches a nonced policy to every response, redirects included", async () => {
    const passed = await proxy(request("/admin/sales", { cookie: await validToken() }));
    const bounced = await proxy(request("/admin/sales"));

    for (const response of [passed, bounced]) {
      const csp = response.headers.get("content-security-policy");
      expect(csp).toMatch(/script-src [^;]*'nonce-[0-9a-f]{32}'/);
    }
  });

  it("mints a fresh nonce per request", async () => {
    const nonceOf = (csp: string | null) => /'nonce-([0-9a-f]{32})'/.exec(csp ?? "")?.[1];

    const first = await proxy(request("/admin/login"));
    const second = await proxy(request("/admin/login"));

    expect(nonceOf(first.headers.get("content-security-policy"))).not.toBe(
      nonceOf(second.headers.get("content-security-policy")),
    );
  });
});
