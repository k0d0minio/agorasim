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
  CalendarCheck,
  FileText,
  Inbox,
  KanbanSquare,
  LayoutDashboard,
  Lightbulb,
  Mail,
  MessageSquareShare,
  Newspaper,
  Share2,
  Users,
} from "lucide-react";

/** Groups, in the order they appear in both navs. Named for jobs, not tables. */
export const ADMIN_NAV_GROUP_ORDER = ["Overview", "Sales", "Marketing", "System"] as const;

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
  /** Earns one of the fixed slots in the mobile bottom toolbar. */
  primary: boolean;
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
    href: "/admin/submissions",
    label: "Submissions",
    cardTitle: "Form submissions",
    icon: Inbox,
    group: "Sales",
    description:
      "Booking enquiries and contact requests will land here for triage and follow-up.",
    dev: false,
    primary: true,
  },
  {
    href: "/admin/crm",
    label: "CRM pipeline",
    shortLabel: "CRM",
    icon: KanbanSquare,
    group: "Sales",
    description:
      "Every lead on one board — Lead → Contacted → Quoted → Booked — so nothing falls through.",
    dev: true,
    primary: true,
  },
  {
    href: "/admin/bookings",
    label: "Bookings",
    icon: CalendarCheck,
    group: "Sales",
    description:
      "Paid tour and wedding bookings, with deposits, balances and payment status at a glance.",
    dev: true,
    primary: true,
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
    primary: false,
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
    icon: Lightbulb,
    group: "System",
    description:
      "Capture and triage ideas and asks for the toolkit — a free-form backlog for the team.",
    dev: false,
    primary: false,
  },
];

/** The nav grouped for the sidebar and the mobile sheet, in display order. */
export const ADMIN_NAV_GROUPS: { title: AdminNavGroup; items: AdminNavItem[] }[] =
  ADMIN_NAV_GROUP_ORDER.map((title) => ({
    title,
    items: ADMIN_NAV.filter((item) => item.group === title),
  }));

/**
 * The fixed slots in the mobile bottom toolbar. Derived from the `primary`
 * flag, so there is no separate href list to keep in step — and no `.find()!`
 * that would take the whole shell down at module evaluation over a typo.
 */
export const ADMIN_PRIMARY_NAV: AdminNavItem[] = ADMIN_NAV.filter((item) => item.primary);

/** Every operations area that earns a dashboard card — everything but the dashboard. */
export const ADMIN_AREAS: AdminNavItem[] = ADMIN_NAV.filter(
  (item) => item.href !== ADMIN_HOME_HREF,
);

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
