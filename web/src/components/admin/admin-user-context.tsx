"use client";

import { createContext, useContext } from "react";
import type { AdminRole } from "@/db/schema";

/**
 * The signed-in operator, made available to the client chrome.
 *
 * `AdminShell` is a client component (it reads `usePathname`) and needs the role
 * to know which nav entries to draw. Threading a prop through all eleven admin
 * pages to tell them each the same thing would be eleven chances to forget; the
 * admin layout is a server component, so it resolves the operator once and puts
 * it here.
 *
 * **This is chrome, not a permission.** Hiding a link is not access control, and
 * nothing here is trusted by anything that matters: every owner-only page calls
 * `requireAdmin("owner")` on the server, and so does every action behind it.
 * A tampered client value changes which links are drawn and nothing else.
 */
export type AdminViewer = {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
} | null;

const AdminViewerContext = createContext<AdminViewer>(null);

export function AdminViewerProvider({
  viewer,
  children,
}: {
  viewer: AdminViewer;
  children: React.ReactNode;
}) {
  return (
    <AdminViewerContext.Provider value={viewer}>{children}</AdminViewerContext.Provider>
  );
}

/** The signed-in operator, or `null` on the login screen. */
export function useAdminViewer(): AdminViewer {
  return useContext(AdminViewerContext);
}
