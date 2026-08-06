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

/**
 * The same rule for Server Actions, and it is not a formality here.
 *
 * `proxy.ts` deliberately lets action POSTs through without checking the
 * session cookie, because redirecting one re-POSTs its body at the login screen
 * and hands the operator a broken error page instead of a sign-in prompt. The
 * proxy was never the boundary — but with actions no longer passing under it at
 * all, `requireAdmin()` inside each action is the *only* thing standing between
 * a signed-out POST and the database. An action that forgets the call is now a
 * hole rather than a near miss, so the omission is caught here.
 *
 * `login` is the exception by design: it is the one action a signed-out caller
 * is supposed to reach, and it is throttled per IP instead.
 */
const UNAUTHENTICATED_ACTIONS = new Set(["login"]);

/** Every `actions.ts` under `app/admin`, as paths relative to that directory. */
function actionFiles(dir: string = ADMIN_DIR, prefix = ""): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      found.push(...actionFiles(join(dir, entry.name), relative));
    } else if (entry.name === "actions.ts") {
      found.push(relative);
    }
  }
  return found.sort();
}

/**
 * Split a `"use server"` module into one entry per exported action, each paired
 * with its body. Bodies are delimited by a column-zero `}` — the formatting
 * every file here already follows, and the same blunt-instrument trade the page
 * walk above makes.
 */
function exportedActions(source: string): { name: string; body: string }[] {
  const found: { name: string; body: string }[] = [];
  const lines = source.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const match = /^export async function (\w+)/.exec(lines[i]);
    if (!match) continue;

    const body: string[] = [];
    for (let j = i + 1; j < lines.length && lines[j] !== "}"; j++) {
      body.push(lines[j]);
    }
    found.push({ name: match[1], body: body.join("\n") });
  }

  return found;
}

describe("admin server actions", () => {
  const files = actionFiles();

  it("finds the action modules to check", () => {
    expect(files).toContain("actions.ts");
    expect(files).toContain("experiences/actions.ts");
  });

  it.each(files)("%s: every action authorizes itself", (file) => {
    const actions = exportedActions(readFileSync(join(ADMIN_DIR, file), "utf8"));
    expect(actions.length).toBeGreaterThan(0);

    const unauthorized = actions
      .filter(({ name }) => !UNAUTHENTICATED_ACTIONS.has(name))
      .filter(({ body }) => !/\b(requireAdmin|requireOwner)\(/.test(body))
      .map(({ name }) => name);

    expect(unauthorized).toEqual([]);
  });
});
