import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The audit writer is tested at the `@/db` boundary: the point of the helper is
 * the *shape* of what it inserts and its failure behaviour, both of which are
 * observable from the values handed to `db.insert(...).values(...)`.
 */
const values = vi.fn<(row: Record<string, unknown>) => Promise<void>>();
const insert = vi.fn(() => ({ values }));

vi.mock("@/db", () => ({
  db: { insert: () => insert() },
  auditLog: { _: "audit_log" },
  adminUsers: { _: "admin_users" },
}));

vi.mock("@/lib/request-ip", () => ({
  clientIp: async () => "203.0.113.9",
}));

const { recordAudit, recordAuditOrWarn, redactSubject } = await import("./audit");

const ACTOR = "11111111-2222-3333-4444-555555555555";

beforeEach(() => {
  insert.mockClear();
  values.mockReset();
  values.mockResolvedValue(undefined);
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("recordAudit", () => {
  it("writes the actor, the action, the entity and the request IP", async () => {
    await recordAudit({
      actorUserId: ACTOR,
      action: "tour_request.status_changed",
      entityType: "tour_request",
      entityId: "abc",
      after: { status: "archived" },
    });

    expect(values).toHaveBeenCalledWith({
      actorUserId: ACTOR,
      action: "tour_request.status_changed",
      entityType: "tour_request",
      entityId: "abc",
      before: null,
      after: { status: "archived" },
      ipAddress: "203.0.113.9",
    });
  });

  it("accepts a null actor, for the scheduled retention job", async () => {
    await recordAudit({
      actorUserId: null,
      action: "tour_request.anonymised_by_retention",
      entityType: "tour_request",
      ipAddress: null,
    });

    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({ actorUserId: null, entityId: null, ipAddress: null }),
    );
  });

  it("throws when the write fails, so an irreversible caller can abort", async () => {
    values.mockRejectedValue(new Error("connection reset"));

    await expect(
      recordAudit({
        actorUserId: ACTOR,
        action: "tour_request.deleted",
        entityType: "tour_request",
        entityId: "abc",
      }),
    ).rejects.toThrow("connection reset");
  });
});

describe("recordAuditOrWarn", () => {
  it("swallows a failed write, so a completed mutation is not reported as failed", async () => {
    values.mockRejectedValue(new Error("connection reset"));

    await expect(
      recordAuditOrWarn({
        actorUserId: ACTOR,
        action: "tour_request.status_changed",
        entityType: "tour_request",
        entityId: "abc",
      }),
    ).resolves.toBeUndefined();

    expect(console.error).toHaveBeenCalled();
  });
});

describe("redactSubject", () => {
  it("keeps the domain and an initial, and drops the person", () => {
    expect(redactSubject({ email: "Ana.Silva@example.com", name: "Ana Silva" })).toEqual({
      redacted: true,
      emailDomain: "example.com",
      emailLength: 21,
      nameInitial: "A",
    });
  });

  it("never returns the address, the local part, or the full name", () => {
    const redacted = JSON.stringify(
      redactSubject({ email: "ana.silva@example.com", name: "Ana Silva" }),
    );

    expect(redacted).not.toContain("ana.silva");
    expect(redacted).not.toContain("Silva");
  });

  it("does not hash the address", () => {
    // A hash of an email is still personal data — anyone with a candidate list
    // can confirm a match — so two different addresses on the same domain must
    // be indistinguishable here.
    const a = redactSubject({ email: "one@example.com", name: "X" });
    const b = redactSubject({ email: "two@example.com", name: "X" });
    expect(a).toEqual(b);
  });

  it("copes with missing or malformed input", () => {
    expect(redactSubject({})).toEqual({
      redacted: true,
      emailDomain: null,
      emailLength: null,
      nameInitial: null,
    });
    expect(redactSubject({ email: "not-an-address", name: "" })).toMatchObject({
      emailDomain: null,
      nameInitial: null,
    });
  });
});
