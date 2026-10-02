import { describe, expect, it } from "vitest";

import { locales } from "@/i18n/config";

import {
  BASELINE_SECURITY_HEADERS,
  PAYMENT_CSP,
  PAYMENT_PERMISSIONS_POLICY,
  PAYMENT_ROUTE_SOURCES,
  PUBLIC_CSP,
  adminCsp,
} from "./security-headers";
import { isPaymentRoutePath } from "./payment-route";

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
  ["payment", PAYMENT_CSP],
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

  it("admits only the Vercel Blob pair — uploads out, previews in", () => {
    // Guest personal data lives behind this policy, so every third party here
    // is a decision someone had to make deliberately, not a copy-paste from
    // the public list. Today that is exactly one feature: experience photos
    // uploading from the catalogue editor to blob storage.
    const origins = new Set(ADMIN_CSP.match(/https?:\/\/[^\s;]+/g) ?? []);
    expect([...origins].sort()).toEqual([
      "https://*.public.blob.vercel-storage.com",
      "https://vercel.com/api/blob/",
    ]);
    expect(directive(ADMIN_CSP, "frame-src")).toEqual(["'none'"]);
    // The upload allowance is path-scoped and fetch-only. Scripts stay
    // first-party: nothing above may creep into script-src.
    expect(directive(ADMIN_CSP, "connect-src")).toEqual([
      "'self'",
      "https://vercel.com/api/blob/",
    ]);
    expect(directive(ADMIN_CSP, "script-src").join(" ")).not.toMatch(/https?:\/\//);
  });

  it("is unique per request", () => {
    expect(adminCsp("one")).not.toEqual(adminCsp("two"));
  });
});

describe("public CSP", () => {
  it("admits the blob image host, and nothing else", () => {
    // Booking is the site's own form, so no booking provider appears here any
    // more. The one third party left is where uploaded experience photos are
    // served from — an image source and nothing more.
    const origins = new Set(PUBLIC_CSP.match(/https?:\/\/[^\s;]+/g) ?? []);
    expect([...origins].sort()).toEqual(["https://*.public.blob.vercel-storage.com"]);
    expect(directive(PUBLIC_CSP, "img-src")).toContain(
      "https://*.public.blob.vercel-storage.com",
    );
    expect(directive(PUBLIC_CSP, "script-src").join(" ")).not.toContain(
      "blob.vercel-storage.com",
    );
  });

  it("frames nothing and is framed by nothing", () => {
    // The FareHarbor lightbox was the only embed the site ever loaded; with
    // booking on our own form, both directions are closed.
    expect(directive(PUBLIC_CSP, "frame-src")).toEqual(["'none'"]);
    expect(directive(PUBLIC_CSP, "frame-ancestors")).toEqual(["'none'"]);
  });
});

/** Every directive name in a policy, in order. */
function directiveNames(csp: string): string[] {
  return csp
    .split(";")
    .map((part) => part.trim().split(/\s+/)[0])
    .filter(Boolean);
}

/** Stripe's published embedded-Checkout origins: Stripe.js plus Checkout. */
const STRIPE_ADDITIONS: Record<string, string[]> = {
  "script-src": ["https://js.stripe.com", "https://*.js.stripe.com", "https://checkout.stripe.com"],
  "frame-src": [
    "https://js.stripe.com",
    "https://*.js.stripe.com",
    "https://hooks.stripe.com",
    "https://checkout.stripe.com",
  ],
  "connect-src": ["https://api.stripe.com", "https://checkout.stripe.com"],
  "img-src": ["https://*.stripe.com"],
};

describe("payment CSP — the booking route", () => {
  it("is the public policy plus Stripe's embedded Checkout, and nothing else", () => {
    // Same directives, same order: a directive tightened on the public policy
    // cannot be left behind here, because this one is derived from it.
    expect(directiveNames(PAYMENT_CSP)).toEqual(directiveNames(PUBLIC_CSP));

    for (const name of directiveNames(PUBLIC_CSP)) {
      const additions = STRIPE_ADDITIONS[name];
      // `'none'` gives way only where Stripe is added (`frame-src`); everywhere
      // else — `object-src` — it stands exactly as on the public policy.
      const publicValues = additions
        ? directive(PUBLIC_CSP, name).filter((value) => value !== "'none'")
        : directive(PUBLIC_CSP, name);
      expect(directive(PAYMENT_CSP, name), name).toEqual([...publicValues, ...(additions ?? [])]);
    }
  });

  it("frames Stripe only, and is still framed by nothing", () => {
    expect(directive(PAYMENT_CSP, "frame-src")).not.toContain("'none'");
    expect(directive(PAYMENT_CSP, "frame-src").every((src) => src.endsWith("stripe.com"))).toBe(
      true,
    );
    expect(directive(PAYMENT_CSP, "frame-ancestors")).toEqual(["'none'"]);
  });

  it("admits no third party but Stripe and the photo host", () => {
    const origins = new Set(PAYMENT_CSP.match(/https?:\/\/[^\s;]+/g) ?? []);
    for (const origin of origins) {
      expect(
        origin.endsWith(".stripe.com") ||
          origin.endsWith("//js.stripe.com") ||
          origin === "https://*.public.blob.vercel-storage.com",
        origin,
      ).toBe(true);
    }
  });

  it("leaves the public and admin policies exactly as they were", () => {
    expect(PUBLIC_CSP).not.toContain("stripe.com");
    expect(ADMIN_CSP).not.toContain("stripe.com");
  });
});

describe("payment Permissions-Policy — the booking route", () => {
  const baseline = BASELINE_SECURITY_HEADERS.find(
    (header) => header.key === "Permissions-Policy",
  )!.value;

  /** Feature name → its allowlist, from a Permissions-Policy value. */
  const features = (value: string) =>
    Object.fromEntries(
      value.split(",").map((entry) => {
        const [name, allow] = entry.trim().split("=");
        return [name, allow];
      }),
    );

  it("delegates payment to Stripe's frames, and changes no other feature", () => {
    const pay = features(PAYMENT_PERMISSIONS_POLICY);
    const base = features(baseline);
    expect(Object.keys(pay)).toEqual(Object.keys(base));
    expect(pay.payment).toBe('(self "https://js.stripe.com" "https://checkout.stripe.com")');
    for (const name of Object.keys(base).filter((key) => key !== "payment")) {
      expect(pay[name], name).toBe(base[name]);
    }
  });

  it("keeps payment off everywhere else", () => {
    expect(features(baseline).payment).toBe("()");
  });
});

describe("payment route", () => {
  it("is the booking page and what lies below it, in every locale", () => {
    for (const locale of locales) {
      expect(PAYMENT_ROUTE_SOURCES).toContain(`/:locale(${locales.join("|")})/reservar`);
      expect(isPaymentRoutePath(`/${locale}/reservar`)).toBe(true);
      expect(isPaymentRoutePath(`/${locale}/reservar/confirmacao`)).toBe(true);
    }
    expect(PAYMENT_ROUTE_SOURCES).toContain(`/:locale(${locales.join("|")})/reservar/:path*`);
  });

  it("is no other page", () => {
    for (const path of ["/pt", "/en/experiencias", "/pt/reservarx", "/fr/reservar", "/admin", "/pt/reserva/cancelar/x"]) {
      expect(isPaymentRoutePath(path), path).toBe(false);
    }
  });
});
