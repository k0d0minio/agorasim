"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import {
  ADMIN_SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  createSessionToken,
  isValidPassword,
  requireAdmin,
} from "@/lib/admin-auth";
import { LOGIN_RATE_LIMIT, rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request-ip";
import {
  db,
  tourRequests,
  featureRequests,
  type RequestStatus,
  type FeatureRequestStatus,
  type FeatureRequestPriority,
} from "@/db";
import {
  REQUEST_STATUSES,
  FEATURE_REQUEST_STATUSES,
  FEATURE_REQUEST_PRIORITIES,
} from "@/lib/admin-format";
import { CATALOGUE_ITEMS, PROPOSAL_CATEGORY, euro } from "@/lib/proposal";

export type LoginState = { error?: string };

/** Shown for a wrong password and for a throttled IP alike — see `login`. */
const LOGIN_ERROR = "Incorrect password.";

/**
 * Handle the admin login form. On success, set the session cookie and redirect
 * to the requested page (or the dashboard). On failure, return an error to
 * render inline — deliberately vague so we don't confirm valid inputs.
 *
 * This is the one unauthenticated action, and it guards a single shared password,
 * so it is throttled per IP. A throttled caller gets the same message as a wrong
 * password: telling an attacker they hit the limit tells them the limit exists
 * and how to pace around it. Failures are logged server-side instead.
 */
export async function login(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "");

  const ip = await clientIp();
  const throttle = await rateLimit(`admin-login:${ip}`, LOGIN_RATE_LIMIT);
  if (!throttle.allowed) {
    console.warn(
      `[admin] login throttled for ${ip} — retry in ${throttle.retryAfterSeconds}s`,
    );
    return { error: LOGIN_ERROR };
  }

  if (!(await isValidPassword(password))) {
    console.warn(
      `[admin] failed login from ${ip} — ${throttle.remaining} attempt(s) left before throttling`,
    );
    return { error: LOGIN_ERROR };
  }

  const cookieStore = await cookies();
  cookieStore.set(ADMIN_SESSION_COOKIE, await createSessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });

  // Only follow same-origin admin paths to avoid open-redirect abuse.
  const destination = next.startsWith("/admin") ? next : "/admin";
  redirect(destination);
}

/** Clear the session cookie and return to the login screen. */
export async function logout(): Promise<void> {
  await requireAdmin();

  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_SESSION_COOKIE);
  redirect("/admin/login");
}

function isRequestStatus(value: string): value is RequestStatus {
  return (REQUEST_STATUSES as string[]).includes(value);
}

/** Result of an inline status change, so the caller can surface a failure. */
export type StatusUpdateState = { ok?: boolean; error?: string };

/**
 * Update the triage status of a tour request from the Submissions list. Invoked
 * from the status menu; revalidates the page so the change is reflected
 * immediately.
 *
 * The menu applies the new value optimistically, so a write that fails silently
 * would leave the operator looking at a status the database never stored — hence
 * the explicit result and the try/catch. Arguments rather than FormData: the
 * control is a menu, not a form.
 */
export async function updateTourRequestStatus(
  id: string,
  status: string,
): Promise<StatusUpdateState> {
  await requireAdmin();

  if (!id || !isRequestStatus(status)) {
    console.warn(
      `[admin] rejected tour-request status update (id=${id || "missing"}, status=${status || "missing"})`,
    );
    return { error: "Couldn't update that status." };
  }

  try {
    await db
      .update(tourRequests)
      .set({ status, updatedAt: new Date() })
      .where(eq(tourRequests.id, id));
  } catch (err) {
    console.error("[admin] failed to update tour request status", err);
    return { error: "Couldn't save — the change was not stored." };
  }

  revalidatePath("/admin/submissions");
  revalidatePath("/admin");
  return { ok: true };
}

function isFeatureRequestStatus(value: string): value is FeatureRequestStatus {
  return (FEATURE_REQUEST_STATUSES as string[]).includes(value);
}

function isFeatureRequestPriority(value: string): value is FeatureRequestPriority {
  return (FEATURE_REQUEST_PRIORITIES as string[]).includes(value);
}

export type FeatureRequestState = {
  ok?: boolean;
  error?: string;
  /** Field-level errors keyed by input name, for inline display. */
  fieldErrors?: Partial<Record<"title" | "description", string>>;
};

/**
 * Store a feature request raised from the admin dashboard. Free-form: the only
 * validation is that a title and description are present. `priority` falls back
 * to "medium" and any unknown value is ignored.
 */
export async function submitFeatureRequest(
  _prevState: FeatureRequestState,
  formData: FormData,
): Promise<FeatureRequestState> {
  await requireAdmin();

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();
  const submittedBy = String(formData.get("submittedBy") ?? "").trim();
  const priorityRaw = String(formData.get("priority") ?? "").trim();

  const fieldErrors: FeatureRequestState["fieldErrors"] = {};
  if (!title) fieldErrors.title = "Give the request a short title.";
  if (!description) fieldErrors.description = "Describe what you'd like to see.";
  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors };
  }

  try {
    await db.insert(featureRequests).values({
      title,
      description,
      category: category || null,
      submittedBy: submittedBy || null,
      priority: isFeatureRequestPriority(priorityRaw) ? priorityRaw : "medium",
    });
  } catch (err) {
    console.error("[admin] failed to store feature request", err);
    return { error: "Something went wrong saving the request. Please try again." };
  }

  revalidatePath("/admin/feature-requests");
  revalidatePath("/admin");
  return { ok: true };
}

/**
 * Update the triage status of a feature request from its status menu.
 * Revalidates the page so the change shows immediately. Reports failures the
 * same way as {@link updateTourRequestStatus}, and for the same reason.
 */
export async function updateFeatureRequestStatus(
  id: string,
  status: string,
): Promise<StatusUpdateState> {
  await requireAdmin();

  if (!id || !isFeatureRequestStatus(status)) {
    console.warn(
      `[admin] rejected feature-request status update (id=${id || "missing"}, status=${status || "missing"})`,
    );
    return { error: "Couldn't update that status." };
  }

  try {
    await db
      .update(featureRequests)
      .set({ status, updatedAt: new Date() })
      .where(eq(featureRequests.id, id));
  } catch (err) {
    console.error("[admin] failed to update feature request status", err);
    return { error: "Couldn't save — the change was not stored." };
  }

  revalidatePath("/admin/feature-requests");
  revalidatePath("/admin");
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
 * picker on the Feature-requests page. Items already on file (same title, under
 * the Proposal category) are skipped so clicking twice can't create duplicates.
 */
export async function requestProposalFeatures(input: {
  ids: string[];
  submittedBy?: string;
}): Promise<RequestProposalState> {
  await requireAdmin();

  const items = (input.ids ?? [])
    .map((id) => CATALOGUE_ITEMS[id])
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  if (items.length === 0) {
    return { error: "Pick at least one feature to request." };
  }

  const submittedBy = (input.submittedBy ?? "").trim() || null;

  try {
    // Skip items already requested from the catalogue (dedupe by title).
    const existing = await db
      .select({ title: featureRequests.title })
      .from(featureRequests)
      .where(eq(featureRequests.category, PROPOSAL_CATEGORY));
    const alreadyRequested = new Set(existing.map((row) => row.title));

    const fresh = items.filter((item) => !alreadyRequested.has(item.name));
    const skipped = items.length - fresh.length;

    if (fresh.length === 0) {
      revalidatePath("/admin/feature-requests");
      return { ok: true, created: 0, skipped };
    }

    await db.insert(featureRequests).values(
      fresh.map((item) => ({
        title: item.name,
        description: `${item.summary}\n\nEstimated ${item.kind} price: €${euro(item.price)}. Added from the proposal catalogue.`,
        category: PROPOSAL_CATEGORY,
        submittedBy,
        priority: "medium" as FeatureRequestPriority,
      })),
    );

    revalidatePath("/admin/feature-requests");
    revalidatePath("/admin");
    return { ok: true, created: fresh.length, skipped };
  } catch (err) {
    console.error("[admin] failed to request proposal features", err);
    return { error: "Something went wrong filing the request. Please try again." };
  }
}
