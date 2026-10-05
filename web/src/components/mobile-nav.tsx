"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

/** `fullLoad`: a plain `<a>` rather than a client-side navigation (`/reservar`). */
type NavItem = { label: string; href: string; fullLoad?: boolean };

export function MobileNav({
  items,
  brand,
  openLabel,
  children,
}: {
  items: NavItem[];
  brand: string;
  openLabel: string;
  /** Booking CTA rendered at the bottom of the panel. */
  children?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden" aria-label={openLabel}>
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-72">
        <SheetHeader>
          <SheetTitle className="font-heading text-xl">{brand}</SheetTitle>
        </SheetHeader>
        <nav className="mt-2 flex flex-col gap-1 px-4">
          {items.map((item) => {
            const className =
              "rounded-md px-2 py-2.5 text-base text-foreground transition-colors hover:bg-accent hover:text-accent-foreground";
            const close = () => setOpen(false);
            return item.fullLoad ? (
              <a key={item.href} href={item.href} onClick={close} className={className}>
                {item.label}
              </a>
            ) : (
              <Link key={item.href} href={item.href} onClick={close} className={className}>
                {item.label}
              </Link>
            );
          })}
        </nav>
        {children && <div className="mt-4 px-4" onClick={() => setOpen(false)}>{children}</div>}
      </SheetContent>
    </Sheet>
  );
}
