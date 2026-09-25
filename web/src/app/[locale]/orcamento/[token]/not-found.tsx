import Link from "next/link";
import { HelpCircle } from "lucide-react";

import { locales, t } from "@/i18n/config";
import { quotePageContent } from "@/content/quote-page";
import { systemContent } from "@/content/system";
import { href } from "@/lib/routes";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Section } from "@/components/section";

/**
 * The couple's quote 404 — reached only via `proxy.ts` rewriting a dead
 * link's token to `DEAD_QUOTE_TOKEN` (`lib/quote-token.ts`) before this
 * segment ever renders, and the page's own synchronous check throwing
 * `notFound()` on it. That ordering is what earns the real 404 status: see
 * `page.tsx`'s note and `loading.tsx`'s Status Codes doc.
 *
 * Two languages at once, for the reason `[locale]/not-found.tsx` already is
 * one: `not-found.tsx` receives no route params, so there is no `locale` to
 * read here. The wording is the page's own `InvalidPanel` copy ("this link
 * is no longer valid"), not the generic site 404 — a dead quote link reads
 * differently from a page that was never there.
 */
export default function QuoteNotFound() {
  const c = quotePageContent.invalid;

  return (
    <Section>
      <div className="mx-auto flex max-w-xl flex-col items-center gap-6 px-4 py-24 text-center">
        <Card className="w-full text-left">
          <CardContent className="p-6">
            <div className="flex size-11 items-center justify-center rounded-xl bg-muted text-muted-foreground">
              <HelpCircle className="size-5" />
            </div>
            <div className="mt-4 space-y-4">
              {locales.map((locale) => (
                <div key={locale} lang={locale}>
                  <h1 className="font-heading text-xl font-semibold">{t(c.title, locale)}</h1>
                  <p className="mt-1 text-muted-foreground">{t(c.body, locale)}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <div className="flex flex-wrap items-center justify-center gap-2">
          {locales.map((locale) => (
            <Button key={locale} asChild variant={locale === "pt" ? "default" : "outline"}>
              <Link href={href(locale, "home")} lang={locale} hrefLang={locale}>
                {t(systemContent.notFound.home, locale)}
              </Link>
            </Button>
          ))}
        </div>
      </div>
    </Section>
  );
}
