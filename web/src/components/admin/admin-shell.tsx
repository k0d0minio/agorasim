"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ADMIN_PRIMARY_NAV,
  adminNavGroups,
  adminPageTitle,
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
import { logout } from "@/app/admin/actions";

function SidebarLink({ item, pathname }: { item: AdminNavItem; pathname: string }) {
  const { href, label, icon: Icon, dev } = item;
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        isAdminNavItemActive(href, pathname)
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
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

/** One slot in the mobile bottom toolbar: icon over a tiny label. */
function ToolbarTab({
  active,
  icon: Icon,
  label,
  href,
  onClick,
}: {
  active: boolean;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  href?: string;
  onClick?: () => void;
}) {
  const className = cn(
    "flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-lg py-1.5 transition-colors",
    active ? "text-primary" : "text-muted-foreground hover:text-foreground",
  );
  const body = (
    <>
      <Icon className={cn("size-5", active && "stroke-[2.25]")} />
      <span className="w-full truncate text-center text-[10px] font-medium leading-tight">
        {label}
      </span>
    </>
  );
  return href ? (
    <Link href={href} className={className} aria-current={active ? "page" : undefined}>
      {body}
    </Link>
  ) : (
    <button type="button" onClick={onClick} className={className} aria-expanded={active}>
      {body}
    </button>
  );
}

/**
 * Mobile navigation: a fixed bottom toolbar with the everyday destinations,
 * plus "More" opening a bottom sheet with the full grouped map.
 */
function MobileBottomNav({
  pathname,
  groups,
}: {
  pathname: string;
  groups: { title: AdminNavGroup; items: AdminNavItem[] }[];
}) {
  const [moreOpen, setMoreOpen] = useState(false);
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
          active={!primaryActive}
          icon={LayoutGrid}
          label="More"
          onClick={() => setMoreOpen(true)}
        />

        <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
          <SheetContent
            side="bottom"
            className="rounded-t-2xl pb-[max(env(safe-area-inset-bottom),1rem)]"
          >
            <SheetHeader className="pb-0">
              <SheetTitle>All areas</SheetTitle>
            </SheetHeader>
            <div className="grid grid-cols-2 gap-x-2 gap-y-4 px-4 pt-1">
              {groups.map((group) => (
                <div key={group.title} className="min-w-0">
                  <p className="px-2 pb-1 text-[11px] font-semibold tracking-wider text-muted-foreground/70 uppercase">
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
                            "flex items-center gap-2 rounded-lg px-2 py-2 text-sm font-medium transition-colors",
                            isAdminNavItemActive(item.href, pathname)
                              ? "bg-primary text-primary-foreground"
                              : "text-foreground/80 hover:bg-muted",
                          )}
                        >
                          <Icon className="size-4 shrink-0" />
                          <span className="truncate">{item.label}</span>
                          {item.dev && (
                            <span
                              className="ml-auto size-1.5 shrink-0 rounded-full bg-accent-foreground/50"
                              aria-label="In development"
                            />
                          )}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            <p className="px-6 text-[11px] leading-relaxed text-muted-foreground/70">
              <span className="mr-1 inline-block size-1.5 rounded-full bg-accent-foreground/50 align-middle" />
              marks areas in development — final design, example data.
            </p>
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
 */
export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const viewer = useAdminViewer();
  // Entries above the viewer's role are simply not drawn. The pages behind them
  // enforce the role themselves — see `admin-user-context.tsx`.
  const groups = adminNavGroups(viewer?.role ?? null);

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-60 shrink-0 flex-col border-r bg-muted/30 p-4 md:flex">
        <div className="px-2 py-3">
          <p className="font-heading text-lg font-semibold">Agorasim</p>
          <p className="text-xs text-muted-foreground">Operations</p>
        </div>
        <nav className="mt-2 flex flex-col gap-5">
          {groups.map((group) => (
            <div key={group.title}>
              <p className="px-3 pb-1.5 text-[11px] font-semibold tracking-wider text-muted-foreground/70 uppercase">
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
        <p className="mt-auto px-3 pt-6 text-[11px] leading-relaxed text-muted-foreground/70">
          <span className="mr-1 inline-block size-1.5 rounded-full bg-accent-foreground/50 align-middle" />
          marks areas in development — final design, example data.
        </p>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between gap-3 border-b px-4 sm:px-6">
          <h1 className="font-heading text-base font-semibold">{adminPageTitle(pathname)}</h1>
          <div className="flex min-w-0 items-center gap-2">
            {/* Who you are signed in as. With a shared password there was
                nothing to show here — and no way to notice you were on a
                colleague's session. */}
            {viewer ? (
              <span className="hidden truncate text-xs text-muted-foreground sm:inline">
                {viewer.name}
                <span className="ml-1 opacity-70">({viewer.role})</span>
              </span>
            ) : null}
            <form action={logout}>
              <Button type="submit" variant="ghost" size="sm">
                <LogOut className="size-4" />
                Sign out
              </Button>
            </form>
          </div>
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
