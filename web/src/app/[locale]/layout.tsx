import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Geist, Geist_Mono, Fraunces } from "next/font/google";
import "../globals.css";
import { locales, isLocale, type Locale } from "@/i18n/config";
import { site, taglines } from "@/content/site";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { FareHarborScript } from "@/components/fareharbor-script";
import { alternates } from "@/lib/seo";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const fraunces = Fraunces({ variable: "--font-fraunces", subsets: ["latin"], display: "swap" });

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

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

  return (
    <html
      lang={typedLocale}
      className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable}`}
    >
      <body className="flex min-h-screen flex-col antialiased">
        <SiteHeader locale={typedLocale} />
        <main className="flex-1">{children}</main>
        <SiteFooter locale={typedLocale} />
        <FareHarborScript />
      </body>
    </html>
  );
}
