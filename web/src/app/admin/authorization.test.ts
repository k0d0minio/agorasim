import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * Every page under `/admin` must authorize itself.
 *
 * This is a structural test rather than a behavioural one, and it exists because
 * the rule it enforces is exactly the kind that decays silently. `proxy.ts`
 * gates `/admin/:path*` by URL, which makes an unauthorized page *look* fine in
 * a browser — you cannot reach it signed out, so nothing is obviously broken.
 * But the proxy is not the authorization boundary (see the note at the top of
 * `lib/admin-auth.ts`): it has no database access, so it cannot know that an
 * account was disabled, signed out everywhere, or never had the role the page
 * needs, and a published Next.js advisory has already had to fix one App Router
 * proxy bypass.
 *
 * Seven pages had drifted past this rule by the time it was written. They were
 * all design previews rendering example data, so nothing leaked — which is the
 * point: the omission was invisible precisely because the pages had no real data
 * to lose yet, and would have stopped being invisible only once they did.
 *
 * A grep is a blunt instrument, and it deliberately checks only that the call is
 * *present*. Whether a given page needs `requireAdmin` or `requireOwner` is a
 * judgement about that page's data; whether it is called at all is not.
 */
const ADMIN_DIR = join(import.meta.dirname, ".");

/**
 * The login screen is the one page that must render for a signed-out visitor —
 * it is where `requireAdmin` sends everyone it turns away. `proxy.ts` allows it
 * through for the same reason.
 */
const UNAUTHENTICATED_PAGES = new Set(["login/page.tsx"]);

/** Every `page.tsx` under `app/admin`, as paths relative to that directory. */
function adminPages(dir: string = ADMIN_DIR, prefix = ""): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      found.push(...adminPages(join(dir, entry.name), relative));
    } else if (entry.name === "page.tsx") {
      found.push(relative);
    }
  }
  return found.sort();
}

describe("admin pages", () => {
  const pages = adminPages();

  // Guards the walker itself: a refactor that moved the pages elsewhere would
  // otherwise turn this whole file into a vacuous pass over an empty list.
  it("finds the admin pages to check", () => {
    expect(pages.length).toBeGreaterThan(10);
    expect(pages).toContain("sales/page.tsx");
    expect(pages).toContain("settings/users/page.tsx");
  });

  it.each(pages.filter((page) => !UNAUTHENTICATED_PAGES.has(page)))(
    "%s authorizes itself",
    (page) => {
      const source = readFileSync(join(ADMIN_DIR, page), "utf8");
      expect(source).toMatch(/\b(requireAdmin|requireOwner)\(/);
    },
  );

  it("keeps the login screen reachable while signed out", () => {
    for (const page of UNAUTHENTICATED_PAGES) {
      const source = readFileSync(join(ADMIN_DIR, page), "utf8");
      expect(source).not.toMatch(/\b(requireAdmin|requireOwner)\(/);
    }
  });
});
