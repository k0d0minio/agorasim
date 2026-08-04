/**
 * The admin operations map — **the** definition of it.
 *
 * This used to exist three times: `SECTIONS` on the dashboard, `NAV_GROUPS` in
 * the shell, and the `title` string every page hand-passed to `<AdminShell>`.
 * They happened to agree; nothing made them. Everything now derives from the
 * list below — the dashboard cards, the desktop sidebar, the mobile sheet, the
 * bottom toolbar and the page heading. Add an area here and all five follow.
 *
 * This is the repo's own ICM principle — *configure the factory, not the
 * product* — applied to its own UI.
 */
import type { ComponentType } from "react";
import {
  CarFront,
  FileText,
  Inbox,
  LayoutDashboard,
  Lightbulb,
  Mail,
  MessageSquareShare,
  Newspaper,
  ScrollText,
  Share2,
  ShieldCheck,
  UserCog,
  Users,
} from "lucide-react";
import type { AdminRole } from "@/db/schema";

/** Groups, in the order they appear in both navs. Named for jobs, not tables. */
export const ADMIN_NAV_GROUP_ORDER = [
  "Overview",
  "Sales",
  "Marketing",
  "System",
  "Settings",
] as const;

export type AdminNavGroup = (typeof ADMIN_NAV_GROUP_ORDER)[number];

export type AdminNavItem = {
  href: string;
  /** Sidebar and sheet entry, and the page's `<h1>`. */
  label: string;
  /**
   * Dashboard card heading, where a longer, more descriptive name reads better
   * than the nav entry. Falls back to `label`.
   */
  cardTitle?: string;
  /** Bottom-toolbar label, where horizontal space is tight. Falls back to `label`. */
  shortLabel?: string;
  icon: ComponentType<{ className?: string }>;
  group: AdminNavGroup;
  /** Sentence shown on the dashboard card. */
  description: string;
  /** Design preview — the feature behind it is still in development. */
  dev: boolean;
  /**
   * Earns one of the fixed slots in the mobile bottom toolbar. Reserved for the
   * areas actually wired to real data: the toolbar used to spend two of its
   * four slots on CRM and Bookings — design previews — while Content and
   * Feature requests, which have data today, sat behind "More".
   */
  primary: boolean;
  /**
   * Minimum role needed to see this entry. Absent means every signed-in operator.
   *
   * This is presentation only — hiding a link is not access control. The page
   * behind an owner-only entry calls `requireAdmin("owner")` for itself, and so
   * does every action it can reach. Typing the URL gets you the forbidden
   * screen, not the page.
   */
  role?: AdminRole;
};

/** The dashboard itself, which is a nav destination but not one of its own cards. */
export const ADMIN_HOME_HREF = "/admin";

export const ADMIN_NAV: AdminNavItem[] = [
  {
    href: ADMIN_HOME_HREF,
    label: "Dashboard",
    icon: LayoutDashboard,
    group: "Overview",
    description: "Today's numbers and a way into every other area.",
    dev: false,
    primary: true,
  },
  {
    href: "/admin/sales",
    label: "Sales",
    cardTitle: "Enquiries & bookings",
    shortLabel: "Sales",
    icon: Inbox,
    group: "Sales",
    description:
      "Every enquiry and booking on one board — New → Contacted → Quoted → Booked — or as a table.",
    dev: false,
    primary: true,
  },
  {
    href: "/admin/experiences",
    label: "Experiences",
    cardTitle: "The catalogue",
    shortLabel: "Catalogue",
    icon: CarFront,
    group: "Sales",
    description:
      "The experiences and add-ons you sell: names, descriptions, durations and what shows on the site.",
    dev: false,
    primary: false,
  },
  {
    href: "/admin/blog",
    label: "Blog studio",
    icon: Newspaper,
    group: "Marketing",
    description:
      "AI-drafted articles in your voice, waiting for a one-click review before publishing.",
    dev: true,
    primary: false,
  },
  {
    href: "/admin/social",
    label: "Social studio",
    icon: Share2,
    group: "Marketing",
    description:
      "A generated posting calendar for Instagram & Facebook — approve, and it posts itself.",
    dev: true,
    primary: false,
  },
  {
    href: "/admin/email",
    label: "Email marketing",
    icon: Mail,
    group: "Marketing",
    description:
      "Segments and bilingual campaigns that bring past and archived guests back for more.",
    dev: true,
    primary: false,
  },
  {
    href: "/admin/referrals",
    label: "Referrals",
    icon: Users,
    group: "Marketing",
    description:
      "Personal links for happy guests, tracked bookings, and the rewards you owe your fans.",
    dev: true,
    primary: false,
  },
  {
    href: "/admin/content",
    label: "Content",
    cardTitle: "Generated content",
    icon: FileText,
    group: "System",
    description:
      "Review GEO/marketing drafts produced by the workspaces before publishing them to the site.",
    dev: false,
    primary: true,
  },
  {
    href: "/admin/notifications",
    label: "Notifications",
    icon: MessageSquareShare,
    group: "System",
    description:
      "Automatic confirmations, reminders and thank-yous for guests — instant alerts for you.",
    dev: true,
    primary: false,
  },
  {
    href: "/admin/feature-requests",
    label: "Feature requests",
    shortLabel: "Requests",
    icon: Lightbulb,
    group: "System",
    description:
      "Capture and triage ideas and asks for the toolkit — a free-form backlog for the team.",
    dev: false,
    primary: true,
  },
  {
    href: "/admin/settings/account",
    label: "My account",
    cardTitle: "My account",
    shortLabel: "Account",
    icon: UserCog,
    group: "Settings",
    description: "Change your own password and sign out of every device at once.",
    dev: false,
    primary: false,
  },
  {
    href: "/admin/settings/users",
    label: "Team accounts",
    cardTitle: "Team accounts",
    shortLabel: "Team",
    icon: ShieldCheck,
    group: "Settings",
    description:
      "Who can sign in to this admin, what they're allowed to do, and how to disable an account.",
    dev: false,
    primary: false,
    role: "owner",
  },
  {
    href: "/admin/settings/audit",
    label: "Audit log",
    cardTitle: "Audit log",
    shortLabel: "Audit",
    icon: ScrollText,
    group: "Settings",
    description: "Every change made in this admin, who made it and when.",
    dev: false,
    primary: false,
    role: "owner",
  },
];

/**
 * The nav entries `role` may see. Ordering and grouping are unchanged; entries
 * above the caller's role simply are not there.
 *
 * `null` — nobody signed in — sees nothing role-gated, which is what the login
 * screen and the boundary components render against.
 */
export function visibleAdminNav(role: AdminRole | null): AdminNavItem[] {
  return ADMIN_NAV.filter((item) => {
    if (!item.role) return true;
    return role === "owner" || role === item.role;
  });
}

/** The nav grouped for the sidebar and the mobile sheet, in display order. */
export function adminNavGroups(
  role: AdminRole | null,
): { title: AdminNavGroup; items: AdminNavItem[] }[] {
  const visible = visibleAdminNav(role);
  return ADMIN_NAV_GROUP_ORDER.map((title) => ({
    title,
    items: visible.filter((item) => item.group === title),
  })).filter((group) => group.items.length > 0);
}

/**
 * The fixed slots in the mobile bottom toolbar. Derived from the `primary`
 * flag, so there is no separate href list to keep in step — and no `.find()!`
 * that would take the whole shell down at module evaluation over a typo.
 *
 * Nothing role-gated is `primary`, so this needs no role argument.
 */
export const ADMIN_PRIMARY_NAV: AdminNavItem[] = ADMIN_NAV.filter((item) => item.primary);

/** Every operations area that earns a dashboard card — everything but the dashboard. */
export function adminAreas(role: AdminRole | null): AdminNavItem[] {
  return visibleAdminNav(role).filter((item) => item.href !== ADMIN_HOME_HREF);
}

/** Whether `href` is the area the operator is currently in. */
export function isAdminNavItemActive(href: string, pathname: string): boolean {
  return href === ADMIN_HOME_HREF ? pathname === ADMIN_HOME_HREF : pathname.startsWith(href);
}

/** The nav entry a pathname belongs to — the most specific match wins. */
export function findAdminNavItem(pathname: string): AdminNavItem | undefined {
  return ADMIN_NAV.filter((item) => isAdminNavItemActive(item.href, pathname)).sort(
    (a, b) => b.href.length - a.href.length,
  )[0];
}

/** Heading for the admin page at `pathname`. */
export function adminPageTitle(pathname: string): string {
  return findAdminNavItem(pathname)?.label ?? "Admin";
}
