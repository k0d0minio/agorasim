"use client";

import { usePathname } from "next/navigation";
import type { Locale } from "@/i18n/config";
import { href } from "@/lib/routes";
import { BookingButton } from "@/components/booking-button";

/**
 * Persistent "book" CTA, phones only.
 *
 * Above `lg` the header carries the booking button; below it, the header hides
 * that button behind the menu sheet — so on the width most guests actually use,
 * the one action the whole site exists to produce was two taps and a scroll
 * away. This puts it one tap away on every page.
 *
 * Fixed rather than sticky-in-flow: it must be reachable from the top of a long
 * page, not only after scrolling to the end of one. `SiteFooter` pads itself by
 * the bar's height so nothing is permanently hidden underneath, and the root
 * `scroll-pb` keeps focused elements clear of it.
 */
export function BookingBar({ locale, label }: { locale: Locale; label: string }) {
  const pathname = usePathname();
  const target = href(locale, "reservar");

  // Not on the booking page itself: there the form *is* the page, and a floating
  // duplicate of its own call to action would only cover the fields.
  if (pathname === target) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border/70 bg-background/90 px-4 pt-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] backdrop-blur supports-backdrop-filter:bg-background/75 lg:hidden">
      <BookingButton locale={locale} label={label} className="w-full" />
    </div>
  );
}
