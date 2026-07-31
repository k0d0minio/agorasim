import Link from "next/link";
import { locales, t } from "@/i18n/config";
import { systemContent } from "@/content/system";
import { href } from "@/lib/routes";
import { Button } from "@/components/ui/button";

/**
 * 404 for the public site — served when a page in this segment calls
 * `notFound()` (an unknown experience or blog slug). Renders inside the locale
 * layout, so the header and footer stay put.
 *
 * Shown in both languages, because this is the one page that cannot know which
 * one to use: `not-found.tsx` receives no route params, and Next only renders
 * the Server Component half of a not-found boundary into the HTML — a Client
 * Component reading the locale off `usePathname` would leave a visitor without
 * JavaScript looking at the loading skeleton. Two languages, two ways home.
 */
export default function LocaleNotFound() {
  const c = systemContent.notFound;

  return (
    <section className="mx-auto flex max-w-xl flex-col items-center gap-6 px-4 py-24 text-center">
      <div className="space-y-2">
        <h1 className="font-heading text-2xl font-medium">
          {locales.map((locale) => t(c.title, locale)).join(" · ")}
        </h1>
        {locales.map((locale) => (
          <p key={locale} lang={locale} className="text-muted-foreground">
            {t(c.body, locale)}
          </p>
        ))}
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        {locales.map((locale) => (
          <Button key={locale} asChild variant={locale === "pt" ? "default" : "outline"}>
            <Link href={href(locale, "home")} lang={locale} hrefLang={locale}>
              {t(c.home, locale)}
            </Link>
          </Button>
        ))}
      </div>
    </section>
  );
}
