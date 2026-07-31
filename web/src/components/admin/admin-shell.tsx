"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeft,
  CalendarCheck,
  FileText,
  Inbox,
  KanbanSquare,
  LayoutDashboard,
  LayoutGrid,
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { InDevLegend, InDevMarker } from "@/components/admin/in-dev-marker";
import { logout } from "@/app/admin/actions";

type NavItem = {
  href: string;
  label: string;
  /** Short label for the bottom toolbar, where space is tight. */
  shortLabel?: string;
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
      { href: "/admin/submissions", label: "Submissions", shortLabel: "Inbox", icon: Inbox },
      { href: "/admin/crm", label: "CRM pipeline", shortLabel: "CRM", icon: KanbanSquare, dev: true },
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
      { href: "/admin/feature-requests", label: "Feature requests", shortLabel: "Requests", icon: Lightbulb },
    ],
  },
];

/**
 * The four destinations that earn a fixed slot in the mobile bottom toolbar:
 * every area that is actually wired to real data. The toolbar used to spend two
 * of its four slots on CRM and Bookings — design previews — while Content and
 * Feature requests, which have real data, sat behind "More".
 */
const PRIMARY_HREFS = [
  "/admin",
  "/admin/submissions",
  "/admin/content",
  "/admin/feature-requests",
];

const NAV_FLAT: NavItem[] = NAV_GROUPS.flatMap((g) => g.items);
const PRIMARY_ITEMS: NavItem[] = PRIMARY_HREFS.flatMap((href) => {
  const item = NAV_FLAT.find((i) => i.href === href);
  return item ? [item] : [];
});

function isActive(pathname: string, href: string): boolean {
  return href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
}

function SidebarLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const { href, label, icon: Icon, dev } = item;
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
        isActive(pathname, href)
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      <Icon className="size-4 shrink-0" />
      <span className="truncate">{label}</span>
      {dev && <InDevMarker className="ml-auto" />}
    </Link>
  );
}

/**
 * One slot in the mobile bottom toolbar: icon over a label. Sized past the
 * 44pt / 48dp touch guidance rather than exactly at it, and labelled at 12px in
 * a colour that clears WCAG AA — this is a tool used outdoors, in sunlight.
 */
function ToolbarTab({
  active,
  icon: Icon,
  label,
  href,
  onClick,
  buttonProps,
}: {
  active: boolean;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  href?: string;
  onClick?: () => void;
  buttonProps?: React.ComponentProps<"button">;
}) {
  const className = cn(
    "flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-lg py-1.5 transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
    active ? "text-primary" : "text-muted-foreground hover:text-foreground",
  );
  const body = (
    <>
      <Icon className={cn("size-5", active && "stroke-[2.25]")} />
      <span className="w-full truncate text-center text-xs font-medium leading-tight">
        {label}
      </span>
    </>
  );
  return href ? (
    <Link href={href} className={className} aria-current={active ? "page" : undefined}>
      {body}
    </Link>
  ) : (
    <button type="button" onClick={onClick} className={className} {...buttonProps}>
      {body}
    </button>
  );
}

/**
 * Mobile navigation: a fixed bottom toolbar with the four everyday
 * destinations, plus "More" opening a bottom sheet with the full grouped map.
 */
function MobileBottomNav({ pathname }: { pathname: string }) {
  const [moreOpen, setMoreOpen] = useState(false);
  const sheetId = useId();
  const primaryActive = PRIMARY_ITEMS.some((i) => isActive(pathname, i.href));

  return (
    <nav
      aria-label="Admin"
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur supports-backdrop-filter:bg-background/85 md:hidden"
    >
      <div className="flex items-stretch gap-1 px-2 py-1">
        {PRIMARY_ITEMS.map((item) => (
          <ToolbarTab
            key={item.href}
            href={item.href}
            active={isActive(pathname, item.href)}
            icon={item.icon}
            label={item.shortLabel ?? item.label}
          />
        ))}

        <ToolbarTab
          // Tracks the sheet, not the route: this button opens a dialog, and
          // announcing "expanded" on every non-primary page was a lie.
          active={moreOpen || !primaryActive}
          icon={LayoutGrid}
          label="More"
          onClick={() => setMoreOpen(true)}
          buttonProps={{
            "aria-expanded": moreOpen,
            "aria-haspopup": "dialog",
            "aria-controls": moreOpen ? sheetId : undefined,
          }}
        />

        <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
          <SheetContent
            id={sheetId}
            side="bottom"
            className="rounded-t-2xl pb-[max(env(safe-area-inset-bottom),1rem)]"
          >
            <SheetHeader className="pb-0">
              <SheetTitle>All areas</SheetTitle>
            </SheetHeader>
            <div className="grid grid-cols-2 gap-x-2 gap-y-4 px-4 pt-1">
              {NAV_GROUPS.map((group) => (
                <div key={group.title} className="min-w-0">
                  <p className="px-2 pb-1 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                    {group.title}
                  </p>
                  <div className="flex flex-col gap-0.5">
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setMoreOpen(false)}
                          className={cn(
                            "flex min-h-11 items-center gap-2 rounded-lg px-2 py-2 text-sm font-medium transition-colors",
                            isActive(pathname, item.href)
                              ? "bg-primary text-primary-foreground"
                              : "text-foreground/80 hover:bg-muted",
                          )}
                        >
                          <Icon className="size-4 shrink-0" />
                          <span className="truncate">{item.label}</span>
                          {item.dev && <InDevMarker className="ml-auto" />}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            <InDevLegend className="px-6" />
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}

/** Dashboard chrome (sidebar on desktop, bottom toolbar on mobile). */
export function AdminShell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isDashboard = pathname === "/admin";

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
              <p className="px-3 pb-1.5 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                {group.title}
              </p>
              <div className="flex flex-col gap-0.5">
                {group.items.map((item) => (
                  <SidebarLink key={item.href} item={item} pathname={pathname} />
                ))}
              </div>
            </div>
          ))}
        </nav>
        <InDevLegend className="mt-auto px-3 pt-6" />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/*
          Sticky, and padded for the status bar: installed standalone there is
          no browser chrome, so this header is the only title and the only way
          out — scrolling a long list must not take it away.
        */}
        <header className="sticky top-0 z-30 flex min-h-14 items-center gap-1 border-b bg-background/95 px-4 pt-[env(safe-area-inset-top)] backdrop-blur supports-backdrop-filter:bg-background/85 sm:px-6">
          {!isDashboard && (
            <Button
              asChild
              variant="ghost"
              size="icon"
              className="-ml-2 size-11 shrink-0 md:hidden"
            >
              {/* No browser back button in the installed PWA — this is the way up. */}
              <Link href="/admin" aria-label="Back to dashboard">
                <ArrowLeft />
              </Link>
            </Button>
          )}
          <h1 className="min-w-0 flex-1 truncate font-heading text-base font-semibold">
            {title}
          </h1>
          <form action={logout}>
            <Button type="submit" variant="ghost" className="h-11 sm:h-8">
              <LogOut className="size-4" />
              Sign out
            </Button>
          </form>
        </header>

        {/* Bottom toolbar height + safe area, so content never hides behind it. */}
        <main className="flex-1 p-4 pb-[calc(4.5rem+env(safe-area-inset-bottom))] sm:p-6 md:pb-6">
          {children}
        </main>
      </div>

      <MobileBottomNav pathname={pathname} />
    </div>
  );
}
