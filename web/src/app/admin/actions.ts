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
import { db, tourRequests, type RequestStatus } from "@/db";
import { REQUEST_STATUSES } from "@/lib/admin-format";

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
