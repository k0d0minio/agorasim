"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Inbox, FileText, Lightbulb, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { logout } from "@/app/admin/actions";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

const NAV: NavItem[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/submissions", label: "Submissions", icon: Inbox },
  { href: "/admin/content", label: "Content", icon: FileText },
  { href: "/admin/feature-requests", label: "Feature requests", icon: Lightbulb },
];

function isActive(pathname: string, href: string): boolean {
  return href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
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
        <nav className="mt-4 flex flex-col gap-1">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive(pathname, href)
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon className="size-4" />
              {label}
            </Link>
          ))}
        </nav>
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
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors",
                isActive(pathname, href)
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon className="size-4" />
              {label}
            </Link>
          ))}
        </nav>

        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
