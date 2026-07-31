import { beforeEach, describe, expect, it, vi } from "vitest";

import { ADMIN_SESSION_COOKIE, createSessionToken } from "./admin-session";
import type { AdminUserSummary } from "./admin-users";

/**
 * `requireAdmin` is the authorization boundary, so it is tested through its real
 * path — cookie → token → account lookup → decision — with only the three things
 * it cannot have in a unit test mocked out: the request's cookies, Next's
 * `redirect`, and the database.
 *
 * `redirect` is mocked to throw the way the real one does, because the whole
 * contract of `requireAdmin` is that nothing after a failed check runs.
 */
const cookieJar = new Map<string, string>();

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => {
      const value = cookieJar.get(name);
      return value === undefined ? undefined : { name, value };
    },
    set: (name: string, value: string) => cookieJar.set(name, value),
    delete: (name: string) => cookieJar.delete(name),
  }),
}));

class RedirectError extends Error {
  constructor(readonly to: string) {
    super(`NEXT_REDIRECT:${to}`);
  }
}

vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new RedirectError(to);
  },
}));

const findAdminUserById = vi.fn<(id: string) => Promise<AdminUserSummary | null>>();
vi.mock("./admin-users", () => ({ findAdminUserById: (id: string) => findAdminUserById(id) }));

const {
  ADMIN_FORBIDDEN_PATH,
  authorize,
  getCurrentUser,
  requireAdmin,
  roleSatisfies,
} = await import("./admin-auth");

const USER_ID = "11111111-2222-3333-4444-555555555555";

function user(overrides: Partial<AdminUserSummary> = {}): AdminUserSummary {
  return {
    id: USER_ID,
    email: "rita@agorasim.pt",
    name: "Rita",
    role: "collaborator",
    lastLoginAt: null,
    disabledAt: null,
    // Far enough back that a token minted "now" is comfortably after it.
    sessionsValidFrom: new Date("2020-01-01T00:00:00Z"),
    createdAt: new Date("2020-01-01T00:00:00Z"),
    ...overrides,
  };
}

async function signIn(account: AdminUserSummary, userId = account.id): Promise<void> {
  cookieJar.set(ADMIN_SESSION_COOKIE, await createSessionToken(userId));
  findAdminUserById.mockResolvedValue(account);
}

/** Run `fn`, returning the path it redirected to, or `null` if it did not. */
async function redirectedTo(fn: () => Promise<unknown>): Promise<string | null> {
  try {
    await fn();
    return null;
  } catch (err) {
    if (err instanceof RedirectError) return err.to;
    throw err;
  }
}

beforeEach(() => {
  cookieJar.clear();
  findAdminUserById.mockReset();
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

describe("roleSatisfies", () => {
  it("treats a required role as a floor, not an exact match", () => {
    expect(roleSatisfies("owner", "collaborator")).toBe(true);
    expect(roleSatisfies("owner", "owner")).toBe(true);
    expect(roleSatisfies("collaborator", "collaborator")).toBe(true);
    expect(roleSatisfies("collaborator", "owner")).toBe(false);
  });
});

describe("authorize", () => {
  const session = { issuedAt: Math.floor(Date.now() / 1000) };

  it("accepts an active account with no role requirement", () => {
    expect(authorize(user(), session)).toEqual({ ok: true });
  });

  it("rejects when there is no session at all", () => {
    expect(authorize(user(), null)).toEqual({ ok: false, reason: "no-session" });
  });

  it("rejects a session naming an account that no longer exists", () => {
    expect(authorize(null, session)).toEqual({ ok: false, reason: "unknown-user" });
  });

  it("rejects a disabled account, even with a valid token", () => {
    expect(authorize(user({ disabledAt: new Date() }), session)).toEqual({
      ok: false,
      reason: "disabled",
    });
  });

  it("rejects a token issued before a sign-out-everywhere", () => {
    const revoked = user({ sessionsValidFrom: new Date(Date.now() + 60_000) });
    expect(authorize(revoked, session)).toEqual({ ok: false, reason: "revoked" });
  });

  it("keeps a token issued after a sign-out-everywhere", () => {
    const reset = user({ sessionsValidFrom: new Date(Date.now() - 60_000) });
    expect(authorize(reset, session)).toEqual({ ok: true });
  });

  it("rejects a collaborator asking for an owner-only surface", () => {
    expect(authorize(user({ role: "collaborator" }), session, "owner")).toEqual({
      ok: false,
      reason: "role",
    });
  });

  it("lets an owner through an owner-only surface", () => {
    expect(authorize(user({ role: "owner" }), session, "owner")).toEqual({ ok: true });
  });

  it("lets an owner through a collaborator-level surface", () => {
    expect(authorize(user({ role: "owner" }), session, "collaborator")).toEqual({ ok: true });
  });
});

describe("requireAdmin", () => {
  it("returns the signed-in operator", async () => {
    await signIn(user({ role: "owner", name: "Diogo" }));
    const actor = await requireAdmin();
    expect(actor.name).toBe("Diogo");
  });

  it("sends an anonymous caller to the login screen", async () => {
    expect(await redirectedTo(() => requireAdmin())).toBe("/admin/login");
  });

  it("sends a disabled operator to the login screen", async () => {
    await signIn(user({ disabledAt: new Date() }));
    expect(await redirectedTo(() => requireAdmin())).toBe("/admin/login");
  });

  it("sends a signed-out-everywhere session to the login screen", async () => {
    await signIn(user({ sessionsValidFrom: new Date(Date.now() + 60_000) }));
    expect(await redirectedTo(() => requireAdmin())).toBe("/admin/login");
  });

  it("sends a session naming a deleted account to the login screen", async () => {
    cookieJar.set(ADMIN_SESSION_COOKIE, await createSessionToken(USER_ID));
    findAdminUserById.mockResolvedValue(null);
    expect(await redirectedTo(() => requireAdmin())).toBe("/admin/login");
  });

  it("refuses a collaborator on an owner-only surface", async () => {
    await signIn(user({ role: "collaborator" }));
    expect(await redirectedTo(() => requireAdmin("owner"))).toBe(ADMIN_FORBIDDEN_PATH);
  });

  it("sends a wrong-role caller to the forbidden screen, not to login", async () => {
    // Re-authenticating cannot fix a role, so bouncing them to a login form
    // would be actively misleading.
    await signIn(user({ role: "collaborator" }));
    expect(await redirectedTo(() => requireAdmin("owner"))).not.toBe("/admin/login");
  });

  it("lets an owner onto an owner-only surface", async () => {
    await signIn(user({ role: "owner" }));
    await expect(requireAdmin("owner")).resolves.toMatchObject({ role: "owner" });
  });

  it("looks the role up per request rather than trusting the token", async () => {
    // The token is minted while the account is an owner, then the account is
    // demoted. The next call must see the demotion — this is why the role is
    // deliberately absent from the token payload.
    await signIn(user({ role: "owner" }));
    await expect(requireAdmin("owner")).resolves.toBeTruthy();

    findAdminUserById.mockResolvedValue(user({ role: "collaborator" }));
    expect(await redirectedTo(() => requireAdmin("owner"))).toBe(ADMIN_FORBIDDEN_PATH);
  });
});

describe("getCurrentUser", () => {
  it("returns the operator when the session is good", async () => {
    await signIn(user());
    await expect(getCurrentUser()).resolves.toMatchObject({ email: "rita@agorasim.pt" });
  });

  it("returns null rather than redirecting when there is no session", async () => {
    await expect(getCurrentUser()).resolves.toBeNull();
  });

  it("returns null for a disabled account", async () => {
    await signIn(user({ disabledAt: new Date() }));
    await expect(getCurrentUser()).resolves.toBeNull();
  });
});
