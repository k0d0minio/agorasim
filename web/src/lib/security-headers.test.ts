import { describe, expect, it } from "vitest";

import { BASELINE_SECURITY_HEADERS, PUBLIC_CSP, adminCsp } from "./security-headers";

/**
 * These assert the properties the two policies exist for, not their exact text.
 * A CSP is a long string that will be edited — usually to let something new
 * through — and the failure mode worth catching is an edit that quietly widens
 * the admin policy or drops a directive that does not depend on `'unsafe-inline'`
 * to be worth having.
 */

/** Pull one directive's value list out of a policy string. */
function directive(csp: string, name: string): string[] {
  const found = csp
    .split(";")
    .map((part) => part.trim())
    .find((part) => part === name || part.startsWith(`${name} `));
  if (!found) return [];
  return found.slice(name.length).trim().split(/\s+/).filter(Boolean);
}

const ADMIN_CSP = adminCsp("test-nonce");

describe("baseline security headers", () => {
  it("covers the headers that do not depend on a CSP", () => {
    const keys = BASELINE_SECURITY_HEADERS.map((header) => header.key);
    expect(keys).toEqual(
      expect.arrayContaining([
        "Strict-Transport-Security",
        "X-Content-Type-Options",
        "Referrer-Policy",
        "X-Frame-Options",
        "Permissions-Policy",
      ]),
    );
  });

  it("does not commit subdomains or the preload list", () => {
    const hsts = BASELINE_SECURITY_HEADERS.find(
      (header) => header.key === "Strict-Transport-Security",
    );
    // Both are promises made on behalf of hostnames this repo does not control,
    // and `preload` is slow to undo. See the note in the module.
    expect(hsts?.value).not.toMatch(/includeSubDomains|preload/);
    expect(hsts?.value).toMatch(/max-age=\d+/);
  });
});

describe.each([
  ["public", PUBLIC_CSP],
  ["admin", ADMIN_CSP],
])("%s CSP", (_name, csp) => {
  it("locks down the directives that hold without nonces", () => {
    expect(directive(csp, "object-src")).toEqual(["'none'"]);
    expect(directive(csp, "base-uri")).toEqual(["'self'"]);
    expect(directive(csp, "form-action")).toEqual(["'self'"]);
    expect(directive(csp, "frame-ancestors")).toEqual(["'none'"]);
    expect(directive(csp, "default-src")).toEqual(["'self'"]);
    expect(csp).toContain("upgrade-insecure-requests");
  });

  it("keeps inline styles working", () => {
    // Next inlines critical CSS and `next/font` inlines its face declarations.
    expect(directive(csp, "style-src")).toContain("'unsafe-inline'");
    // A nonce here would make browsers ignore `'unsafe-inline'` rather than add
    // to it, which would break the above.
    expect(directive(csp, "style-src").join(" ")).not.toContain("nonce-");
  });
});

describe("admin CSP", () => {
  it("carries the request's nonce and trusts nothing inline", () => {
    expect(directive(ADMIN_CSP, "script-src")).toContain("'nonce-test-nonce'");
    expect(directive(ADMIN_CSP, "script-src")).toContain("'strict-dynamic'");
    expect(directive(ADMIN_CSP, "script-src")).not.toContain("'unsafe-inline'");
  });

  it("admits no third party at all", () => {
    // The operations area talks to nothing but itself. Guest personal data lives
    // behind this policy, so a third party appearing here should be a decision
    // someone had to make deliberately, not a copy-paste from the public list.
    expect(ADMIN_CSP).not.toMatch(/https?:\/\//);
    expect(directive(ADMIN_CSP, "frame-src")).toEqual(["'none'"]);
    expect(directive(ADMIN_CSP, "connect-src")).toEqual(["'self'"]);
  });

  it("is unique per request", () => {
    expect(adminCsp("one")).not.toEqual(adminCsp("two"));
  });
});

describe("public CSP", () => {
  it("admits FareHarbor, and only FareHarbor", () => {
    const origins = new Set(PUBLIC_CSP.match(/https?:\/\/[^\s;]+/g) ?? []);
    expect([...origins].sort()).toEqual([
      "https://*.fareharbor.com",
      "https://fareharbor.com",
    ]);
  });

  it("allows FareHarbor to be framed but never frames us", () => {
    // The embed relationship runs one way: we frame their booking flow.
    expect(directive(PUBLIC_CSP, "frame-src")).toContain("https://fareharbor.com");
    expect(directive(PUBLIC_CSP, "frame-ancestors")).toEqual(["'none'"]);
  });
});
