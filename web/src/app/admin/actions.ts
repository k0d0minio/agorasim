"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { eq } from "drizzle-orm";
import {
  ADMIN_SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  createSessionToken,
  isValidPassword,
} from "@/lib/admin-auth";
import { db, tourRequests, featureRequests, type FeatureRequestPriority } from "@/db";
import {
  featureRequestSchema,
  formValues,
  loginSchema,
  proposalRequestSchema,
  updateFeatureRequestStatusSchema,
  updateTourRequestStatusSchema,
  type FeatureRequestField,
} from "@/lib/form-schemas";
import { CATALOGUE_ITEMS, PROPOSAL_CATEGORY, euro } from "@/lib/proposal";

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
 */

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
  const parsed = loginSchema.safeParse(formValues(formData));
  if (!parsed.success || !isValidPassword(parsed.data.password)) {
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

  redirect(parsed.data.next);
}

/** Clear the session cookie and return to the login screen. */
export async function logout(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_SESSION_COOKIE);
  redirect("/admin/login");
}

/**
 * Update the triage status of a tour request from the Submissions table.
 * Invoked from the inline status `<select>`, which submits on change.
 */
export async function updateTourRequestStatus(formData: FormData): Promise<void> {
  const parsed = updateTourRequestStatusSchema.safeParse(formValues(formData));
  if (!parsed.success) return;

  await db
    .update(tourRequests)
    .set({ status: parsed.data.status, updatedAt: new Date() })
    .where(eq(tourRequests.id, parsed.data.id));
}

/** Update the triage status of a feature request from its inline `<select>`. */
export async function updateFeatureRequestStatus(formData: FormData): Promise<void> {
  const parsed = updateFeatureRequestStatusSchema.safeParse(formValues(formData));
  if (!parsed.success) return;

  await db
    .update(featureRequests)
    .set({ status: parsed.data.status, updatedAt: new Date() })
    .where(eq(featureRequests.id, parsed.data.id));
}

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
 */
export async function submitFeatureRequest(
  _prevState: FeatureRequestState,
  formData: FormData,
): Promise<FeatureRequestState> {
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

  try {
    await db.insert(featureRequests).values(parsed.data);
  } catch (err) {
    console.error("[admin] failed to store feature request", err);
    return { error: "Something went wrong saving the request. Please try again." };
  }

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
 * Items already on file are skipped by the `(title, category)` unique index
 * plus `onConflictDoNothing`, rather than by reading the existing titles first:
 * a read-then-insert let two in-flight clicks both see "not present" and both
 * insert. `returning()` reports what the database actually wrote, so the
 * created/skipped counts stay honest under that race.
 */
export async function requestProposalFeatures(input: {
  ids: string[];
  submittedBy?: string;
}): Promise<RequestProposalState> {
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
          submittedBy: parsed.data.submittedBy,
          priority: "medium" as FeatureRequestPriority,
        })),
      )
      .onConflictDoNothing({ target: [featureRequests.title, featureRequests.category] })
      .returning({ id: featureRequests.id });

    return { ok: true, created: inserted.length, skipped: items.length - inserted.length };
  } catch (err) {
    console.error("[admin] failed to request proposal features", err);
    return { error: "Something went wrong filing the request. Please try again." };
  }
}
