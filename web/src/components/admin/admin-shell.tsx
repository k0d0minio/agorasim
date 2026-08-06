"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, LayoutGrid, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ADMIN_PRIMARY_NAV,
  adminNavGroups,
  adminPageTitle,
  adminUpHref,
  isAdminNavItemActive,
  type AdminNavGroup,
  type AdminNavItem,
} from "@/lib/admin-nav";
import { useAdminViewer } from "@/components/admin/admin-user-context";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { InDevLegend, InDevMarker } from "@/components/admin/in-dev-marker";
import { logout } from "@/app/admin/actions";

function SidebarLink({ item, pathname }: { item: AdminNavItem; pathname: string }) {
  const { href, label, icon: Icon, dev } = item;
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
        isAdminNavItemActive(href, pathname)
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
 * Who is signed in, and the way out. One component, two homes: the sidebar
 * footer on desktop and the "More" sheet on the phone — the header does not
 * carry either any more, because sign-out is a rare deliberate act and the
 * page's own action deserves that space more (spec §6 N5).
 */
function ViewerFooter({ className }: { className?: string }) {
  const viewer = useAdminViewer();
  return (
    <div className={cn("flex items-center gap-3", className)}>
      {viewer ? (
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{viewer.name}</p>
          <p className="truncate text-xs text-muted-foreground">{viewer.role}</p>
        </div>
      ) : null}
      <form action={logout}>
        <Button type="submit" variant="outline" size="sm">
          <LogOut className="size-4" />
          Sign out
        </Button>
      </form>
    </div>
  );
}

/**
 * One slot in the mobile bottom toolbar: icon over a label. Bottom-edge
 * controls are the *least* accurately hit region of the screen (Hoober's
 * touch data — ~12mm at the bottom edge vs ~7mm mid-screen), so these are
 * sized past the 44pt / 48dp guidance rather than exactly at it, and
 * labelled at 12px in a colour that clears WCAG AA — this is a tool used
 * outdoors, in sunlight.
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
    "flex min-h-12 min-w-0 flex-1 touch-manipulation flex-col items-center justify-center gap-0.5 rounded-lg py-1.5 transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
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
 * Mobile navigation: a fixed bottom toolbar with the everyday destinations,
 * plus "More" opening a bottom sheet with the full grouped map — and, at its
 * foot, who is signed in and the sign-out that used to crowd the header.
 */
function MobileBottomNav({
  pathname,
  groups,
}: {
  pathname: string;
  groups: { title: AdminNavGroup; items: AdminNavItem[] }[];
}) {
  const [moreOpen, setMoreOpen] = useState(false);
  const sheetId = useId();
  const primaryActive = ADMIN_PRIMARY_NAV.some((i) => isAdminNavItemActive(i.href, pathname));

  return (
    <nav
      aria-label="Admin"
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur supports-backdrop-filter:bg-background/85 md:hidden"
    >
      <div className="flex items-stretch gap-1 px-2 py-1">
        {ADMIN_PRIMARY_NAV.map((item) => (
          <ToolbarTab
            key={item.href}
            href={item.href}
            active={isAdminNavItemActive(item.href, pathname)}
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
              {groups.map((group) => (
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
                            isAdminNavItemActive(item.href, pathname)
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
            <ViewerFooter className="border-t px-6 pt-4" />
            <InDevLegend className="px-6" />
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}

/**
 * Dashboard chrome (sidebar on desktop, bottom toolbar on mobile). The heading
 * comes from the nav map keyed on the current route, so a page never restates
 * its own name.
 *
 * The header is a phone app bar: up-affordance, title, and one page-level
 * `action` slot on the trailing side — the HIG toolbar grammar. Installed
 * standalone there is no browser chrome, so this bar is the only title and the
 * only way out; it stays sticky and padded for the status bar, and the arrow
 * goes *up* (see `adminUpHref`), not home.
 */
export function AdminShell({
  children,
  action,
}: {
  children: React.ReactNode;
  /** The page's one primary action, e.g. "Add" on the catalogue. */
  action?: React.ReactNode;
}) {
  const pathname = usePathname();
  const viewer = useAdminViewer();
  // Entries above the viewer's role are simply not drawn. The pages behind them
  // enforce the role themselves — see `admin-user-context.tsx`.
  const groups = adminNavGroups(viewer?.role ?? null);
  const upHref = adminUpHref(pathname);

  return (
    <div className="flex min-h-dvh">
      <aside className="hidden w-60 shrink-0 flex-col border-r bg-muted/30 p-4 md:flex">
        <div className="px-2 py-3">
          <p className="font-heading text-lg font-semibold">Agorasim</p>
          <p className="text-xs text-muted-foreground">Operations</p>
        </div>
        <nav className="mt-2 flex flex-col gap-5">
          {groups.map((group) => (
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
        <div className="mt-auto flex flex-col gap-4 pt-6">
          <InDevLegend className="px-3" />
          <ViewerFooter className="border-t px-1 pt-4" />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex min-h-14 items-center gap-1 border-b bg-background/95 px-2 pt-[env(safe-area-inset-top)] backdrop-blur supports-backdrop-filter:bg-background/85 sm:px-4">
          {upHref ? (
            <Button asChild variant="ghost" size="icon" className="shrink-0">
              {/* No browser back button in the installed PWA — this is the way
                  up. A symbol, not the word "Back" (HIG toolbars). */}
              <Link href={upHref} aria-label="Back">
                <ArrowLeft />
              </Link>
            </Button>
          ) : null}
          <h1 className={cn("min-w-0 flex-1 truncate font-heading text-base font-semibold", !upHref && "pl-2")}>
            {adminPageTitle(pathname)}
          </h1>
          {action ? <div className="shrink-0">{action}</div> : null}
        </header>

        {/* Bottom toolbar height + safe area, so content never hides behind it. */}
        <main className="flex-1 p-4 pb-[calc(4.5rem+env(safe-area-inset-bottom))] sm:p-6 md:pb-6">
          {children}
        </main>
      </div>

      <MobileBottomNav pathname={pathname} groups={groups} />
    </div>
  );
}
