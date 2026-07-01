import Link from "next/link";
import Image from "next/image";
import type { Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { href, navOrder } from "@/lib/routes";
import { site } from "@/content/site";
import { LangToggle } from "@/components/lang-toggle";
import { MobileNav } from "@/components/mobile-nav";
import { BookingButton } from "@/components/booking-button";

export function SiteHeader({ locale }: { locale: Locale }) {
  const dict = getDictionary(locale);
  const items = navOrder.map((key) => ({ label: dict.nav[key], href: href(locale, key) }));

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/70 bg-background/85 backdrop-blur supports-backdrop-filter:bg-background/70">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href={href(locale, "home")} className="flex items-center gap-2" aria-label={site.name}>
          <Image src="/images/logo.png" alt={site.name} width={44} height={44} priority className="h-11 w-11" />
          <span className="font-heading text-2xl font-semibold tracking-tight text-primary">
            {site.name}
          </span>
        </Link>

        <nav className="hidden items-center gap-7 md:flex" aria-label="Primary">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm font-medium text-foreground/80 transition-colors hover:text-primary"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <LangToggle current={locale} label={dict.labels.switchLanguage} />
          <div className="hidden md:block">
            <BookingButton locale={locale} label={dict.cta.book} size="sm" />
          </div>
          <MobileNav items={items} brand={site.name} openLabel={dict.labels.openMenu}>
            <BookingButton locale={locale} label={dict.cta.book} size="default" className="w-full" />
          </MobileNav>
        </div>
      </div>
    </header>
  );
}
