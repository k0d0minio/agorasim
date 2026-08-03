"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { eq, inArray } from "drizzle-orm";
import {
  endSession,
  requireAdmin,
  requireOwner,
  startSession,
} from "@/lib/admin-auth";
import {
  countActiveOwners,
  createAdminUser,
  disableAdminUser,
  enableAdminUser,
  findAdminUserById,
  revokeAdminUserSessions,
  setAdminUserPassword,
  touchLastLogin,
  verifyCredentials,
} from "@/lib/admin-users";
import { recordAudit, recordAuditOrWarn, redactSubject } from "@/lib/audit";
import { LOGIN_RATE_LIMIT, rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request-ip";
import { db, tourRequests, featureRequests, type FeatureRequestPriority } from "@/db";
import {
  adminUserIdSchema,
  bulkTourRequestSchema,
  changePasswordSchema,
  deleteTourRequestSchema,
  exportSubjectSchema,
  featureRequestSchema,
  formValues,
  inviteUserSchema,
  loginSchema,
  proposalRequestSchema,
  updateFeatureRequestStatusSchema,
  updateTourRequestStatusSchema,
  type ChangePasswordField,
  type FeatureRequestField,
  type InviteUserField,
} from "@/lib/form-schemas";
import { CATALOGUE_ITEMS, PROPOSAL_CATEGORY, euro } from "@/lib/proposal";
import { exportSubjectData, subjectExportFilename } from "@/lib/subject-data";

/**
 * None of these actions call `revalidatePath`.
 *
 * Every admin page that reads this data declares `export const dynamic =
 * "force-dynamic"` and re-renders from the database on each request, so there
 * is no cache entry for `revalidatePath` to invalidate — the calls that used to
 * sit here were no-ops wearing a comment about correctness. `force-dynamic`
 * stays because the alternative (prerendering at build time and revalidating on
 * mutation) would require a live `DATABASE_URL` during `next build`, including
 * in CI. Freshness comes from the render, not from cache invalidation.
 *
 * **Two rules every action below follows.**
 *
 * 1. Authorization is `requireAdmin()`/`requireOwner()` at the top of the
 *    action, never the proxy — see `lib/admin-auth.ts`. The role argument is
 *    part of that call, not a separate check somewhere else.
 * 2. Every mutation writes an audit entry naming the actor, through the single
 *    writer in `lib/audit.ts`. `recordAudit` (throws) runs *before* an
 *    irreversible action; `recordAuditOrWarn` (logs and continues) runs after a
 *    reversible one. Nothing here inserts into `audit_log` by hand.
 */

// ---------------------------------------------------------------------------
// Sessions
// ---------------------------------------------------------------------------

export type LoginState = { error?: string };

/** Shown for every failure mode alike — see `login`. */
const LOGIN_ERROR = "Incorrect email or password.";

/**
 * Handle the admin login form. On success, set the session cookie and redirect
 * to the requested page (or the dashboard). On failure, return an error to
 * render inline — deliberately vague so we don't confirm which addresses exist.
 *
 * This is the one unauthenticated action, so it is throttled per IP. A throttled
 * caller gets the same message as a wrong password: telling an attacker they hit
 * the limit tells them the limit exists and how to pace around it. The real
 * reason is logged server-side instead.
 */
export async function login(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  // `next` is normalised to a same-origin admin path by the schema, so a failed
  // parse and a wrong password are indistinguishable to the caller.
  const parsed = loginSchema.safeParse(formValues(formData));

  const ip = await clientIp();
  const throttle = await rateLimit(`admin-login:${ip}`, LOGIN_RATE_LIMIT);
  if (!throttle.allowed) {
    console.warn(
      `[admin] login throttled for ${ip} — retry in ${throttle.retryAfterSeconds}s`,
    );
    return { error: LOGIN_ERROR };
  }

  if (!parsed.success) {
    console.warn(`[admin] malformed login from ${ip}`);
    return { error: LOGIN_ERROR };
  }

  const { email, password, next } = parsed.data;

  const result = await verifyCredentials(email, password);

  if (!result.ok) {
    console.warn(
      `[admin] failed login for ${email} from ${ip} — ${result.reason}, ` +
        `${throttle.remaining} attempt(s) left before throttling`,
    );
    return { error: LOGIN_ERROR };
  }

  const userId = result.user.id;

  await startSession(userId);
  await touchLastLogin(userId);
  await recordAuditOrWarn({
    actorUserId: userId,
    action: "admin_user.signed_in",
    entityType: "admin_user",
    entityId: userId,
  });

  redirect(next);
}

/** Clear the session cookie on this device and return to the login screen. */
export async function logout(): Promise<void> {
  const actor = await requireAdmin();

  await recordAuditOrWarn({
    actorUserId: actor.id,
    action: "admin_user.signed_out",
    entityType: "admin_user",
    entityId: actor.id,
  });

  await endSession();
  redirect("/admin/login");
}

/**
 * Sign out of every device, not just this one — for a lost phone or a shared
 * computer. Bumps the account's `sessionsValidFrom`, which invalidates every
 * token issued before now (see `lib/admin-session.ts`).
 */
export async function signOutEverywhere(): Promise<void> {
  const actor = await requireAdmin();

  await revokeAdminUserSessions(actor.id);
  await recordAuditOrWarn({
    actorUserId: actor.id,
    action: "admin_user.sessions_revoked",
    entityType: "admin_user",
    entityId: actor.id,
  });

  await endSession();
  redirect("/admin/login");
}

// ---------------------------------------------------------------------------
// Triage
// ---------------------------------------------------------------------------

/** Result of an inline status change, so the caller can surface a failure. */
export type StatusUpdateState = { ok?: boolean; error?: string };

/**
 * Update the triage status of a tour request from the Submissions list. Invoked
 * from the status menu, which takes arguments rather than `FormData` because the
 * control is a menu, not a form.
 *
 * The menu applies the new value optimistically, so a write that failed silently
 * would leave the operator looking at a status the database never stored — hence
 * the explicit result and the try/catch. It reverts the badge on an error.
 */
export async function updateTourRequestStatus(
  id: string,
  status: string,
): Promise<StatusUpdateState> {
  const actor = await requireAdmin();

  const parsed = updateTourRequestStatusSchema.safeParse({ id, status });
  if (!parsed.success) {
    console.warn("[admin] rejected tour-request status update", z.flattenError(parsed.error));
    return { error: "Couldn't update that status." };
  }

  try {
    // `returning` gives the audit entry a real before-value without a second
    // read, and tells us the row existed at all.
    const [updated] = await db
      .update(tourRequests)
      .set({ status: parsed.data.status, updatedAt: new Date() })
      .where(eq(tourRequests.id, parsed.data.id))
      .returning({ id: tourRequests.id, status: tourRequests.status });

    if (!updated) return { error: "That submission no longer exists." };
  } catch (err) {
    console.error("[admin] failed to update tour request status", err);
    return { error: "Couldn't save — the change was not stored." };
  }

  await recordAuditOrWarn({
    actorUserId: actor.id,
    action: "tour_request.status_changed",
    entityType: "tour_request",
    entityId: parsed.data.id,
    after: { status: parsed.data.status },
  });

  return { ok: true };
}

/**
 * Update the triage status of a feature request from its status menu. Reports
 * failures the same way as {@link updateTourRequestStatus}, and for the same
 * reason.
 */
export async function updateFeatureRequestStatus(
  id: string,
  status: string,
): Promise<StatusUpdateState> {
  const actor = await requireAdmin();

  const parsed = updateFeatureRequestStatusSchema.safeParse({ id, status });
  if (!parsed.success) {
    console.warn("[admin] rejected feature-request status update", z.flattenError(parsed.error));
    return { error: "Couldn't update that status." };
  }

  try {
    await db
      .update(featureRequests)
      .set({ status: parsed.data.status, updatedAt: new Date() })
      .where(eq(featureRequests.id, parsed.data.id));
  } catch (err) {
    console.error("[admin] failed to update feature request status", err);
    return { error: "Couldn't save — the change was not stored." };
  }

  await recordAuditOrWarn({
    actorUserId: actor.id,
    action: "feature_request.status_changed",
    entityType: "feature_request",
    entityId: parsed.data.id,
    after: { status: parsed.data.status },
  });

  return { ok: true };
}

// ---------------------------------------------------------------------------
// Feature requests
// ---------------------------------------------------------------------------

export type FeatureRequestState = {
  ok?: boolean;
  error?: string;
  /** Field-level errors keyed by input name, for inline display. */
  fieldErrors?: Partial<Record<FeatureRequestField, string>>;
};

/**
 * Store a feature request raised from the admin dashboard. Free-form: only a
 * title and description are required, and an unrecognised `priority` falls back
 * to "medium" rather than failing the submission.
 *
 * "Who raised it" is the signed-in account, not a name typed into a box. The old
 * free-text field is preserved as `submittedByLegacy` for rows that predate
 * accounts, and is never written to again.
 */
export async function submitFeatureRequest(
  _prevState: FeatureRequestState,
  formData: FormData,
): Promise<FeatureRequestState> {
  const actor = await requireAdmin();

  const parsed = featureRequestSchema.safeParse(formValues(formData));
  if (!parsed.success) {
    const { fieldErrors } = z.flattenError(parsed.error);
    return {
      fieldErrors: {
        title: fieldErrors.title?.[0],
        description: fieldErrors.description?.[0],
      },
    };
  }

  let createdId: string | undefined;
  try {
    const [created] = await db
      .insert(featureRequests)
      .values({ ...parsed.data, submittedByUserId: actor.id })
      .returning({ id: featureRequests.id });
    createdId = created?.id;
  } catch (err) {
    console.error("[admin] failed to store feature request", err);
    return { error: "Something went wrong saving the request. Please try again." };
  }

  await recordAuditOrWarn({
    actorUserId: actor.id,
    action: "feature_request.created",
    entityType: "feature_request",
    entityId: createdId ?? null,
    after: { title: parsed.data.title, priority: parsed.data.priority },
  });

  return { ok: true };
}

export type RequestProposalState = {
  ok?: boolean;
  /** Number of new requests actually created (skips ones already on file). */
  created?: number;
  /** Selected items that were already requested and therefore skipped. */
  skipped?: number;
  error?: string;
};

/**
 * File a feature request for one or more catalogue items chosen in the proposal
 * picker on the Feature-requests page.
 *
 * Items already on file are skipped by the `(title, category)` unique index plus
 * `onConflictDoNothing`, rather than by reading the existing titles first: a
 * read-then-insert let two in-flight clicks both see "not present" and both
 * insert. `returning()` reports what the database actually wrote, so the
 * created/skipped counts stay honest under that race.
 */
export async function requestProposalFeatures(input: {
  ids: string[];
}): Promise<RequestProposalState> {
  const actor = await requireAdmin();

  const parsed = proposalRequestSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "Pick at least one feature to request." };
  }

  // De-duplicate within the request itself before the database sees it.
  const items = [...new Set(parsed.data.ids)]
    .map((id) => CATALOGUE_ITEMS[id])
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  if (items.length === 0) {
    return { error: "Pick at least one feature to request." };
  }

  try {
    const inserted = await db
      .insert(featureRequests)
      .values(
        items.map((item) => ({
          title: item.name,
          description: `${item.summary}\n\nEstimated ${item.kind} price: €${euro(item.price)}. Added from the proposal catalogue.`,
          category: PROPOSAL_CATEGORY,
          submittedByUserId: actor.id,
          priority: "medium" as FeatureRequestPriority,
        })),
      )
      .onConflictDoNothing({ target: [featureRequests.title, featureRequests.category] })
      .returning({ id: featureRequests.id });

    for (const row of inserted) {
      await recordAuditOrWarn({
        actorUserId: actor.id,
        action: "feature_request.created",
        entityType: "feature_request",
        entityId: row.id,
        after: { source: "proposal-catalogue" },
      });
    }

    return { ok: true, created: inserted.length, skipped: items.length - inserted.length };
  } catch (err) {
    console.error("[admin] failed to request proposal features", err);
    return { error: "Something went wrong filing the request. Please try again." };
  }
}

// ---------------------------------------------------------------------------
// Data-subject rights — owner only
// ---------------------------------------------------------------------------

export type DataRightsState = { ok?: boolean; error?: string; message?: string };

/**
 * Erase one enquiry (GDPR Art. 17). Owner-only, confirmed by typing DELETE, and
 * a genuine hard delete — the row goes, not a flag on it.
 *
 * The audit entry is written **first**, and with `recordAudit`, which throws.
 * If the trail cannot record that an erasure happened, the erasure does not
 * happen: an untraceable deletion of someone's data is a worse outcome than a
 * failed request the operator can retry. The entry itself carries no identifiers
 * — {@link redactSubject} reduces the subject to a domain and a first initial,
 * because quoting the address in the record of erasing it would defeat the
 * erasure.
 */
export async function deleteTourRequest(
  _prevState: DataRightsState,
  formData: FormData,
): Promise<DataRightsState> {
  const actor = await requireOwner();

  const parsed = deleteTourRequestSchema.safeParse(formValues(formData));
  if (!parsed.success) {
    return { error: "Type DELETE to confirm the erasure." };
  }

  const [subject] = await db
    .select({
      id: tourRequests.id,
      email: tourRequests.email,
      name: tourRequests.name,
      status: tourRequests.status,
      createdAt: tourRequests.createdAt,
    })
    .from(tourRequests)
    .where(eq(tourRequests.id, parsed.data.id))
    .limit(1);

  if (!subject) return { error: "That submission no longer exists." };

  try {
    await recordAudit({
      actorUserId: actor.id,
      action: "tour_request.deleted",
      entityType: "tour_request",
      entityId: subject.id,
      before: {
        ...redactSubject(subject),
        status: subject.status,
        createdAt: subject.createdAt.toISOString(),
      },
    });
  } catch (err) {
    console.error("[admin] refused to delete — could not write the audit entry", err);
    return { error: "Couldn't record the erasure, so nothing was deleted. Try again." };
  }

  try {
    await db.delete(tourRequests).where(eq(tourRequests.id, subject.id));
  } catch (err) {
    console.error("[admin] failed to delete tour request", err);
    return { error: "Couldn't delete that submission." };
  }

  return { ok: true, message: "Submission erased." };
}

/**
 * Bulk archive or bulk erase submissions, from the checkboxes on the Submissions
 * table. Archiving is ordinary triage and open to any operator; erasing is the
 * same irreversible act as {@link deleteTourRequest} and is owner-only.
 */
export async function bulkTourRequestAction(
  _prevState: DataRightsState,
  formData: FormData,
): Promise<DataRightsState> {
  // Authorized for the weaker operation first, then escalated below, so a
  // collaborator submitting `operation=delete` is rejected by `requireOwner`
  // rather than by a hand-rolled check that could be forgotten.
  const actor = await requireAdmin();

  const parsed = bulkTourRequestSchema.safeParse(formValues(formData));
  if (!parsed.success) {
    return { error: "Select at least one submission." };
  }

  const { ids, operation } = parsed.data;

  if (operation === "archive") {
    try {
      const updated = await db
        .update(tourRequests)
        .set({ status: "archived", updatedAt: new Date() })
        .where(inArray(tourRequests.id, ids))
        .returning({ id: tourRequests.id });

      await recordAuditOrWarn({
        actorUserId: actor.id,
        action: "tour_request.bulk_status_changed",
        entityType: "tour_request",
        after: { status: "archived", count: updated.length, ids: updated.map((r) => r.id) },
      });

      return { ok: true, message: `Archived ${updated.length} submission(s).` };
    } catch (err) {
      console.error("[admin] failed to bulk-archive tour requests", err);
      return { error: "Couldn't archive those submissions." };
    }
  }

  await requireOwner();

  const subjects = await db
    .select({
      id: tourRequests.id,
      email: tourRequests.email,
      name: tourRequests.name,
      status: tourRequests.status,
    })
    .from(tourRequests)
    .where(inArray(tourRequests.id, ids));

  if (subjects.length === 0) return { error: "Those submissions no longer exist." };

  try {
    await recordAudit({
      actorUserId: actor.id,
      action: "tour_request.bulk_deleted",
      entityType: "tour_request",
      before: {
        count: subjects.length,
        subjects: subjects.map((s) => ({ id: s.id, ...redactSubject(s), status: s.status })),
      },
    });
  } catch (err) {
    console.error("[admin] refused to bulk-delete — could not write the audit entry", err);
    return { error: "Couldn't record the erasure, so nothing was deleted. Try again." };
  }

  try {
    await db.delete(tourRequests).where(
      inArray(
        tourRequests.id,
        subjects.map((s) => s.id),
      ),
    );
  } catch (err) {
    console.error("[admin] failed to bulk-delete tour requests", err);
    return { error: "Couldn't delete those submissions." };
  }

  return { ok: true, message: `Erased ${subjects.length} submission(s).` };
}

export type SubjectExportState = {
  error?: string;
  /** The export, as a JSON string ready for the browser to offer as a download. */
  json?: string;
  filename?: string;
};

/**
 * Subject-access export (GDPR Art. 15): every row, across every table, that
 * references one email address.
 *
 * Owner-only — this is the "exporting guest PII" a collaborator explicitly does
 * not get. The export itself is audited (who exported whose data, and when),
 * because an access request answered off the books is not accountability.
 */
export async function exportSubject(
  _prevState: SubjectExportState,
  formData: FormData,
): Promise<SubjectExportState> {
  const actor = await requireOwner();

  const parsed = exportSubjectSchema.safeParse(formValues(formData));
  if (!parsed.success) {
    return { error: "Enter the email address to export." };
  }

  try {
    const data = await exportSubjectData(parsed.data.email);

    await recordAuditOrWarn({
      actorUserId: actor.id,
      action: "tour_request.exported",
      entityType: "tour_request",
      after: { ...redactSubject({ email: data.subjectEmail }), counts: data.counts },
    });

    return {
      json: JSON.stringify(data, null, 2),
      filename: subjectExportFilename(data.subjectEmail, new Date()),
    };
  } catch (err) {
    console.error("[admin] failed to export subject data", err);
    return { error: "Couldn't build that export." };
  }
}

// ---------------------------------------------------------------------------
// User management — owner only
// ---------------------------------------------------------------------------

export type InviteUserState = {
  ok?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: Partial<Record<InviteUserField, string>>;
};

/**
 * Create an account with a temporary password the owner reads out to the person.
 *
 * A signed invite link would be nicer, but it needs a way to send email, which
 * this deployment does not have yet (email marketing is still on the roadmap).
 * A temporary password handed over out-of-band is honest about that, and the new
 * operator changes it from their own settings screen on first sign-in.
 */
export async function inviteUser(
  _prevState: InviteUserState,
  formData: FormData,
): Promise<InviteUserState> {
  const actor = await requireOwner();

  const parsed = inviteUserSchema.safeParse(formValues(formData));
  if (!parsed.success) {
    const { fieldErrors } = z.flattenError(parsed.error);
    return {
      fieldErrors: {
        email: fieldErrors.email?.[0],
        name: fieldErrors.name?.[0],
        password: fieldErrors.password?.[0],
      },
    };
  }

  const created = await createAdminUser(parsed.data);
  if (!created.ok) {
    return created.reason === "duplicate-email"
      ? { fieldErrors: { email: "That address already has an account." } }
      : { fieldErrors: { password: "That password is too short." } };
  }

  await recordAuditOrWarn({
    actorUserId: actor.id,
    action: "admin_user.created",
    entityType: "admin_user",
    entityId: created.user.id,
    // An operator's own work address and role are not the guest PII the audit
    // log redacts — they are the point of the entry.
    after: { email: created.user.email, name: created.user.name, role: created.user.role },
  });

  return { ok: true, message: `${created.user.name} can now sign in.` };
}

export type UserAdminState = { ok?: boolean; error?: string; message?: string };

/**
 * Disable an account: no sign-in, existing sessions dropped, row kept so the
 * audit entries that name it stay resolvable.
 *
 * Two things it refuses, because both are trivially easy to do by accident and
 * both need a database console to undo: disabling yourself, and disabling the
 * last active owner.
 */
export async function disableUser(
  _prevState: UserAdminState,
  formData: FormData,
): Promise<UserAdminState> {
  const actor = await requireOwner();

  const parsed = adminUserIdSchema.safeParse(formValues(formData));
  if (!parsed.success) return { error: "Couldn't find that account." };

  if (parsed.data.id === actor.id) {
    return { error: "You can't disable your own account." };
  }

  const target = await findAdminUserById(parsed.data.id);
  if (!target) return { error: "Couldn't find that account." };
  if (target.disabledAt) return { ok: true, message: "That account is already disabled." };

  if (target.role === "owner" && (await countActiveOwners()) <= 1) {
    return { error: "That's the last active owner — promote someone else first." };
  }

  try {
    await disableAdminUser(target.id);
  } catch (err) {
    console.error("[admin] failed to disable user", err);
    return { error: "Couldn't disable that account." };
  }

  await recordAuditOrWarn({
    actorUserId: actor.id,
    action: "admin_user.disabled",
    entityType: "admin_user",
    entityId: target.id,
    before: { disabledAt: null },
    after: { email: target.email, disabled: true },
  });

  return { ok: true, message: `${target.name} can no longer sign in.` };
}

/** Re-enable a disabled account. The password is untouched. */
export async function enableUser(
  _prevState: UserAdminState,
  formData: FormData,
): Promise<UserAdminState> {
  const actor = await requireOwner();

  const parsed = adminUserIdSchema.safeParse(formValues(formData));
  if (!parsed.success) return { error: "Couldn't find that account." };

  const target = await findAdminUserById(parsed.data.id);
  if (!target) return { error: "Couldn't find that account." };

  try {
    await enableAdminUser(target.id);
  } catch (err) {
    console.error("[admin] failed to enable user", err);
    return { error: "Couldn't re-enable that account." };
  }

  await recordAuditOrWarn({
    actorUserId: actor.id,
    action: "admin_user.enabled",
    entityType: "admin_user",
    entityId: target.id,
    after: { email: target.email, disabled: false },
  });

  return { ok: true, message: `${target.name} can sign in again.` };
}

export type ChangePasswordState = {
  ok?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: Partial<Record<ChangePasswordField, string>>;
};

/**
 * Change your own password. Any signed-in operator, owner or collaborator —
 * this is the one account action that is not owner-only, because needing an
 * owner to change your own password is how shared passwords come back.
 *
 * Requires the current password: a session cookie on an unattended laptop should
 * not be enough to lock its owner out of their own account. Changing it revokes
 * every session including this one, so the operator signs in again with the new
 * password — which also proves it works.
 */
export async function changeOwnPassword(
  _prevState: ChangePasswordState,
  formData: FormData,
): Promise<ChangePasswordState> {
  const actor = await requireAdmin();

  const parsed = changePasswordSchema.safeParse(formValues(formData));
  if (!parsed.success) {
    const { fieldErrors } = z.flattenError(parsed.error);
    return {
      fieldErrors: {
        currentPassword: fieldErrors.currentPassword?.[0],
        newPassword: fieldErrors.newPassword?.[0],
        confirmPassword: fieldErrors.confirmPassword?.[0],
      },
    };
  }

  const check = await verifyCredentials(actor.email, parsed.data.currentPassword);
  if (!check.ok) {
    return { fieldErrors: { currentPassword: "That isn't your current password." } };
  }

  const changed = await setAdminUserPassword(actor.id, parsed.data.newPassword);
  if (!changed.ok) {
    return { fieldErrors: { newPassword: "That password is too short." } };
  }

  await recordAuditOrWarn({
    actorUserId: actor.id,
    action: "admin_user.password_changed",
    entityType: "admin_user",
    entityId: actor.id,
  });

  // `setAdminUserPassword` already revoked every session; drop the dead cookie
  // rather than leaving the operator on a page that will bounce them anyway.
  await endSession();
  redirect("/admin/login");
}
