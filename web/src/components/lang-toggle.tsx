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
    <div className="flex items-center gap-1 text-sm" aria-label={label}>
      {locales.map((locale, i) => (
        <span key={locale} className="flex items-center gap-1">
          {i > 0 && <span className="text-border">/</span>}
          <Link
            href={pathFor(locale)}
            aria-current={locale === current ? "true" : undefined}
            className={cn(
              "px-1 transition-colors hover:text-primary",
              locale === current ? "font-semibold text-primary" : "text-muted-foreground",
            )}
          >
            {localeNames[locale]}
          </Link>
        </span>
      ))}
    </div>
  );
}
