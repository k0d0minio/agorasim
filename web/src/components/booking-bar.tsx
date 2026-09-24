"use client";

import { usePathname } from "next/navigation";
import type { Locale } from "@/i18n/config";
import { bookingBarTarget } from "@/lib/booking-bar-target";
import { cn } from "@/lib/utils";
import { BookingButton } from "@/components/booking-button";
import { buttonVariants } from "@/components/ui/button";

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
export function BookingBar({
  locale,
  label,
  quoteLabel,
}: {
  locale: Locale;
  label: string;
  /** "Pedir orçamento" — the label on the weddings and events pages. */
  quoteLabel: string;
}) {
  const pathname = usePathname();
  // Where it points, by page — see `lib/booking-bar-target.ts`: hidden on the
  // booking page and on a couple's quote page, the page's own quote form on
  // `/casamentos` and `/eventos`, the tour checkout everywhere else.
  const target = bookingBarTarget(pathname, locale);
  if (target.kind === "hidden") return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border/70 bg-background/90 px-4 pt-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] backdrop-blur supports-backdrop-filter:bg-background/75 lg:hidden">
      {target.kind === "quote" ? (
        // A plain anchor: the form is on this page, so this is a scroll, not a navigation.
        <a href={target.href} className={cn(buttonVariants({ size: "lg" }), "w-full")}>
          {quoteLabel}
        </a>
      ) : (
        <BookingButton locale={locale} label={label} className="w-full" />
      )}
    </div>
  );
}
