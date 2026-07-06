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
} from "@/lib/admin-auth";
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

/**
 * Handle the admin login form. On success, set the session cookie and redirect
 * to the requested page (or the dashboard). On failure, return an error to
 * render inline — deliberately vague so we don't confirm valid inputs.
 */
export async function login(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "");

  if (!isValidPassword(password)) {
    return { error: "Incorrect password." };
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
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_SESSION_COOKIE);
  redirect("/admin/login");
}

function isRequestStatus(value: string): value is RequestStatus {
  return (REQUEST_STATUSES as string[]).includes(value);
}

/**
 * Update the triage status of a tour request from the Submissions table. Invoked
 * from the inline status <select>; revalidates the page so the change is
 * reflected immediately. `/admin` is gated by `proxy.ts`, so this only runs for
 * authenticated operators.
 */
export async function updateTourRequestStatus(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!id || !isRequestStatus(status)) return;

  await db
    .update(tourRequests)
    .set({ status, updatedAt: new Date() })
    .where(eq(tourRequests.id, id));

  revalidatePath("/admin/submissions");
  revalidatePath("/admin");
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
 * to "medium" and any unknown value is ignored. `/admin` is gated by
 * `proxy.ts`, so this only runs for authenticated operators.
 */
export async function submitFeatureRequest(
  _prevState: FeatureRequestState,
  formData: FormData,
): Promise<FeatureRequestState> {
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
 * Update the triage status of a feature request from its inline <select>.
 * Revalidates the page so the change shows immediately.
 */
export async function updateFeatureRequestStatus(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!id || !isFeatureRequestStatus(status)) return;

  await db
    .update(featureRequests)
    .set({ status, updatedAt: new Date() })
    .where(eq(featureRequests.id, id));

  revalidatePath("/admin/feature-requests");
  revalidatePath("/admin");
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
 * `/admin` is gated by `proxy.ts`, so this only runs for authenticated operators.
 */
export async function requestProposalFeatures(input: {
  ids: string[];
  submittedBy?: string;
}): Promise<RequestProposalState> {
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
