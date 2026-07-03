"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  ADMIN_SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  createSessionToken,
  isValidPassword,
} from "@/lib/admin-auth";

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
