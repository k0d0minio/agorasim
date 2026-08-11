import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { Geist, Geist_Mono, Fraunces } from "next/font/google";
import "../globals.css";
import { locales, isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { site, taglines } from "@/content/site";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { BookingBar } from "@/components/booking-bar";
import { alternates } from "@/lib/seo";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const fraunces = Fraunces({ variable: "--font-fraunces", subsets: ["latin"], display: "swap" });

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

/**
 * Mirrors the admin's viewport (`app/admin/layout.tsx`) — guests browse from
 * phones just as the team does, so the public site gets the same treatment
 * (docs/admin-mobile-design-spec.md §5).
 *
 * Note what is *not* here: no `maximumScale` or `userScalable`. Capping zoom
 * would be the quick way to stop iOS zooming into a focused field, and it
 * breaks WCAG 1.4.4 — the fields carry 16px text instead (see `ui/input.tsx`).
 */
export const viewport: Viewport = {
  // --background in globals.css, so the browser chrome blends into the page.
  themeColor: "#fdfaf4",
  // Draw into the notch/home-indicator area; the header and the booking bar
  // pad themselves back out with env(safe-area-inset-*).
  viewportFit: "cover",
  // Android: shrink the layout viewport when the keyboard opens, so the sticky
  // booking bar rises above it instead of being covered. Safari ignores this
  // (WebKit #259770) — hence the form's own submit button stays in flow.
  interactiveWidget: "resizes-content",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const description =
    locale === "pt"
      ? "Passeios guiados em carros clássicos pela região Saloia, entre Sintra, Mafra e a Ericeira. Vinhas, gastronomia, aldeias e costa atlântica."
      : "Guided classic-car tours through the Saloia region, between Sintra, Mafra and Ericeira. Vineyards, food, villages and the Atlantic coast.";

  return {
    metadataBase: new URL(site.domain),
    title: {
      default: `${site.name} — ${taglines[locale]}`,
      template: `%s · ${site.name}`,
    },
    description,
    alternates: alternates(locale, "home"),
    openGraph: {
      type: "website",
      siteName: site.name,
      locale: locale === "pt" ? "pt_PT" : "en_GB",
      title: `${site.name} — ${taglines[locale]}`,
      description,
      url: `/${locale}`,
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const typedLocale: Locale = locale;
  const dict = getDictionary(typedLocale);

  return (
    <html
      lang={typedLocale}
      // Scroll padding equal to the sticky header (4rem) and the booking bar
      // (4.5rem), so a focused or anchored element is never scrolled underneath
      // either one (WCAG 2.4.11).
      className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} scroll-pt-[calc(4rem+env(safe-area-inset-top))] scroll-pb-[calc(4.5rem+env(safe-area-inset-bottom))]`}
    >
      {/* dvh, not screen/100vh: classic vh is the *largest* mobile viewport, so
          a full-height page overflows behind the browser's own chrome. */}
      <body className="flex min-h-dvh flex-col antialiased">
        <SiteHeader locale={typedLocale} />
        <main className="flex-1">{children}</main>
        <SiteFooter locale={typedLocale} />
        <BookingBar locale={typedLocale} label={dict.cta.bookExperience} />
      </body>
    </html>
  );
}
