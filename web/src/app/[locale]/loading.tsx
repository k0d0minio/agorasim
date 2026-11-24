"use client";

import { usePathname } from "next/navigation";
import { localeFromPathname, t } from "@/i18n/config";
import { systemContent } from "@/content/system";

/**
 * Loading state for the public site. The pages are static, so this only shows on
 * a slow first paint or a dynamic segment — a light skeleton of the usual
 * heading-plus-body page shape, not a spinner.
 *
 * It fills the viewport (`min-h-svh`). This file is the Suspense boundary around
 * every page, and React streams a large page after its fallback, even a
 * prerendered one: the first paint shows this skeleton and the footer, and the
 * page arrives a moment later. A short skeleton put the footer in view, and the
 * page pushed it down (layout shift 0.40, JAM-558). A full-height skeleton keeps
 * the footer below the fold until the page is in.
 */
export default function LocaleLoading() {
  const locale = localeFromPathname(usePathname());

  return (
    <section
      className="mx-auto flex min-h-svh max-w-3xl flex-col gap-6 px-4 py-24"
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
