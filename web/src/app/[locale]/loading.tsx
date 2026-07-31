"use client";

import { usePathname } from "next/navigation";
import { localeFromPathname, t } from "@/i18n/config";
import { systemContent } from "@/content/system";

/**
 * Loading state for the public site. The pages are static, so this only shows on
 * a slow first paint or a dynamic segment — a light skeleton of the usual
 * heading-plus-body page shape, not a spinner.
 */
export default function LocaleLoading() {
  const locale = localeFromPathname(usePathname());

  return (
    <section
      className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-24"
      role="status"
      aria-label={t(systemContent.loading.label, locale)}
    >
      <div className="h-8 w-2/3 animate-pulse rounded-md bg-muted" />
      <div className="flex flex-col gap-3">
        <div className="h-4 w-full animate-pulse rounded-md bg-muted" />
        <div className="h-4 w-11/12 animate-pulse rounded-md bg-muted" />
        <div className="h-4 w-3/4 animate-pulse rounded-md bg-muted" />
      </div>
    </section>
  );
}
