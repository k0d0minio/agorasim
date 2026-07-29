"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarCheck,
  FileText,
  Inbox,
  KanbanSquare,
  LayoutDashboard,
  Lightbulb,
  LogOut,
  Mail,
  MessageSquareShare,
  Newspaper,
  Share2,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { logout } from "@/app/admin/actions";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Design preview — the feature behind it is still in development. */
  dev?: boolean;
};

type NavGroup = { title: string; items: NavItem[] };

/**
 * The full operations map, grouped by job-to-be-done. Items flagged `dev`
 * render the final UI with example data and carry an in-development banner.
 */
const NAV_GROUPS: NavGroup[] = [
  {
    title: "Overview",
    items: [{ href: "/admin", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    title: "Sales",
    items: [
      { href: "/admin/submissions", label: "Submissions", icon: Inbox },
      { href: "/admin/crm", label: "CRM pipeline", icon: KanbanSquare, dev: true },
      { href: "/admin/bookings", label: "Bookings", icon: CalendarCheck, dev: true },
    ],
  },
  {
    title: "Marketing",
    items: [
      { href: "/admin/blog", label: "Blog studio", icon: Newspaper, dev: true },
      { href: "/admin/social", label: "Social studio", icon: Share2, dev: true },
      { href: "/admin/email", label: "Email marketing", icon: Mail, dev: true },
      { href: "/admin/referrals", label: "Referrals", icon: Users, dev: true },
    ],
  },
  {
    title: "System",
    items: [
      { href: "/admin/content", label: "Content", icon: FileText },
      { href: "/admin/notifications", label: "Notifications", icon: MessageSquareShare, dev: true },
      { href: "/admin/feature-requests", label: "Feature requests", icon: Lightbulb },
    ],
  },
];

const NAV_FLAT: NavItem[] = NAV_GROUPS.flatMap((g) => g.items);

function isActive(pathname: string, href: string): boolean {
  return href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
}

function NavLink({
  item,
  pathname,
  className,
}: {
  item: NavItem;
  pathname: string;
  className?: string;
}) {
  const { href, label, icon: Icon, dev } = item;
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        isActive(pathname, href)
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
        className,
      )}
    >
      <Icon className="size-4 shrink-0" />
      <span className="truncate">{label}</span>
      {dev && (
        <span
          className="ml-auto size-1.5 shrink-0 rounded-full bg-accent-foreground/50"
          title="In development — design preview"
          aria-label="In development"
        />
      )}
    </Link>
  );
}

/** Dashboard chrome (sidebar + topbar) wrapping every signed-in admin page. */
export function AdminShell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-60 shrink-0 flex-col border-r bg-muted/30 p-4 md:flex">
        <div className="px-2 py-3">
          <p className="font-heading text-lg font-semibold">Agorasim</p>
          <p className="text-xs text-muted-foreground">Operations</p>
        </div>
        <nav className="mt-2 flex flex-col gap-5">
          {NAV_GROUPS.map((group) => (
            <div key={group.title}>
              <p className="px-3 pb-1.5 text-[11px] font-semibold tracking-wider text-muted-foreground/70 uppercase">
                {group.title}
              </p>
              <div className="flex flex-col gap-0.5">
                {group.items.map((item) => (
                  <NavLink key={item.href} item={item} pathname={pathname} />
                ))}
              </div>
            </div>
          ))}
        </nav>
        <p className="mt-auto px-3 pt-6 text-[11px] leading-relaxed text-muted-foreground/70">
          <span className="mr-1 inline-block size-1.5 rounded-full bg-accent-foreground/50 align-middle" />
          marks areas in development — final design, example data.
        </p>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b px-4 sm:px-6">
          <h1 className="font-heading text-base font-semibold">{title}</h1>
          <form action={logout}>
            <Button type="submit" variant="ghost" size="sm">
              <LogOut className="size-4" />
              Sign out
            </Button>
          </form>
        </header>

        {/* Mobile nav — the sidebar is hidden on small screens. */}
        <nav className="flex gap-1 overflow-x-auto border-b px-4 py-2 md:hidden">
          {NAV_FLAT.map((item) => (
            <NavLink
              key={item.href}
              item={item}
              pathname={pathname}
              className="whitespace-nowrap px-3 py-1.5"
            />
          ))}
        </nav>

        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
