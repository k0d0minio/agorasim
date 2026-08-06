import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The account store is tested at the `@/db` boundary, like the audit writer: the
 * behaviour worth pinning is *what it asks the database for* and *what it writes
 * back*, both observable from the fake below.
 *
 * The focus is the break-glass reset path, which is the one piece of this module
 * with no UI in front of it — nobody will notice it silently doing the wrong
 * thing until an operator is locked out and it is the only way back in.
 */
type Row = Record<string, unknown>;

/** Rows the next `select` resolves to. */
let selected: Row[] = [];
/** Values handed to every `update(...).set(...)` in the current test. */
const updates: Row[] = [];

const db = {
  select: () => ({
    from: () => ({
      where: () => ({
        limit: async () => selected,
      }),
    }),
  }),
  update: () => ({
    set: (values: Row) => ({
      where: async () => {
        updates.push(values);
      },
    }),
  }),
};

vi.mock("@/db", () => ({
  db,
  adminUsers: {
    id: "id",
    email: "email",
    name: "name",
    role: "role",
    lastLoginAt: "last_login_at",
    disabledAt: "disabled_at",
    sessionsValidFrom: "sessions_valid_from",
    createdAt: "created_at",
  },
}));

const { findAdminUserByEmail, normalizeEmail, resetAdminUserPasswordByEmail } =
  await import("./admin-users");
const { verifyPassword } = await import("./password");

const USER_ID = "11111111-2222-3333-4444-555555555555";

function row(overrides: Row = {}): Row {
  return {
    id: USER_ID,
    email: "diogo@agorasim.pt",
    name: "Diogo",
    role: "owner",
    lastLoginAt: null,
    disabledAt: null,
    sessionsValidFrom: new Date("2026-01-01T00:00:00Z"),
    createdAt: new Date("2025-12-01T00:00:00Z"),
    ...overrides,
  };
}

beforeEach(() => {
  selected = [];
  updates.length = 0;
});

describe("normalizeEmail", () => {
  it("folds case and surrounding whitespace, so one person is one account", () => {
    expect(normalizeEmail("  Diogo@Agorasim.PT ")).toBe("diogo@agorasim.pt");
  });
});

describe("findAdminUserByEmail", () => {
  it("returns null when no account has that address", async () => {
    expect(await findAdminUserByEmail("nobody@agorasim.pt")).toBeNull();
  });

  it("returns the account without a password hash on it", async () => {
    selected = [row()];
    const user = await findAdminUserByEmail("diogo@agorasim.pt");
    expect(user).not.toBeNull();
    expect(user).not.toHaveProperty("passwordHash");
  });
});

describe("resetAdminUserPasswordByEmail", () => {
  it("stores a verifiable hash of the new password, never the password", async () => {
    selected = [row()];

    const result = await resetAdminUserPasswordByEmail(
      "diogo@agorasim.pt",
      "a long enough passphrase",
    );

    expect(result.ok).toBe(true);
    expect(updates).toHaveLength(1);

    const written = updates[0]!;
    const hash = written.passwordHash as string;
    expect(hash).toMatch(/^scrypt\$/);
    expect(hash).not.toContain("a long enough passphrase");
    expect(await verifyPassword("a long enough passphrase", hash)).toBe(true);
    expect(await verifyPassword("the previous passphrase", hash)).toBe(false);
  });

  it("revokes every existing session, so the old password stops granting access", async () => {
    selected = [row()];
    const before = Date.now();

    await resetAdminUserPasswordByEmail("diogo@agorasim.pt", "a long enough passphrase");

    const validFrom = updates[0]!.sessionsValidFrom as Date;
    expect(validFrom.getTime()).toBeGreaterThanOrEqual(before);
  });

  it("refuses an unknown address instead of creating an account", async () => {
    const result = await resetAdminUserPasswordByEmail(
      "nobody@agorasim.pt",
      "a long enough passphrase",
    );

    expect(result).toEqual({ ok: false, reason: "unknown" });
    expect(updates).toHaveLength(0);
  });

  it("refuses a password under the minimum length, and writes nothing", async () => {
    selected = [row()];

    const result = await resetAdminUserPasswordByEmail("diogo@agorasim.pt", "short");

    expect(result).toEqual({ ok: false, reason: "weak-password" });
    expect(updates).toHaveLength(0);
  });

  it("resets a disabled account and reports that it is still disabled", async () => {
    const disabledAt = new Date("2026-05-01T00:00:00Z");
    selected = [row({ disabledAt })];

    const result = await resetAdminUserPasswordByEmail(
      "diogo@agorasim.pt",
      "a long enough passphrase",
    );

    expect(result.ok && result.user.disabledAt).toEqual(disabledAt);
    expect(updates).toHaveLength(1);
  });
});
