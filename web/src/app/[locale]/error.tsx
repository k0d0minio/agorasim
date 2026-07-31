"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { localeFromPathname, t } from "@/i18n/config";
import { systemContent } from "@/content/system";
import { href } from "@/lib/routes";
import { Button } from "@/components/ui/button";

/**
 * Recovery screen for the public site. Renders inside the locale layout, so the
 * header and footer stay put and the visitor keeps their navigation.
 *
 * The error itself is never rendered — only a retry and a way home. `error.js`
 * has no route params, so the locale comes from the pathname.
 */
export default function LocaleError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  const locale = localeFromPathname(usePathname());
  const c = systemContent.error;

  useEffect(() => {
    console.error("[site] render failed", error);
  }, [error]);

  return (
    <section className="mx-auto flex max-w-xl flex-col items-center gap-6 px-4 py-24 text-center">
      <div className="space-y-2">
        <h1 className="font-heading text-2xl font-medium">{t(c.title, locale)}</h1>
        <p className="text-muted-foreground">{t(c.body, locale)}</p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button type="button" onClick={() => unstable_retry()}>
          {t(c.retry, locale)}
        </Button>
        <Button asChild variant="ghost">
          <Link href={href(locale, "home")}>{t(c.home, locale)}</Link>
        </Button>
      </div>
    </section>
  );
}
