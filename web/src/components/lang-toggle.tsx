"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { locales, localeNames, type Locale } from "@/i18n/config";
import { cn } from "@/lib/utils";

/** Switches locale by swapping the first path segment, preserving the rest of the URL. */
export function LangToggle({ current, label }: { current: Locale; label: string }) {
  const pathname = usePathname();

  function pathFor(locale: Locale): string {
    const parts = pathname.split("/");
    parts[1] = locale; // first segment after leading "/"
    return parts.join("/") || `/${locale}`;
  }

  return (
    /*
     * Two 44px targets rather than two words either side of a slash: this sits
     * in the header, next to the menu button, and was previously a ~24×20px tap
     * area (spec §2 T1). The label stays small inside the larger hit box (T4),
     * which also keeps the two apart by more than the 8px minimum (T3) — so the
     * slash that used to separate them visually is no longer earning its place.
     */
    <div className="flex items-center text-sm" aria-label={label}>
      {locales.map((locale) => (
        <Link
          key={locale}
          href={pathFor(locale)}
          aria-current={locale === current ? "true" : undefined}
          className={cn(
            "inline-flex size-11 touch-manipulation items-center justify-center rounded-lg transition-colors hover:text-primary",
            locale === current ? "font-semibold text-primary" : "text-muted-foreground",
          )}
        >
          {localeNames[locale]}
        </Link>
      ))}
    </div>
  );
}
