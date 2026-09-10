import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale, t } from "@/i18n/config";
import { termsContent } from "@/content/terms";
import { TermsOfSale } from "@/components/terms-of-sale";
import { localeForSegment } from "@/lib/routes";
import { alternates } from "@/lib/seo";

/** The English terms of sale. See `../termos/page.tsx` for why there are two. */
const SEGMENT_LOCALE = localeForSegment("termos", "terms");

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (locale !== SEGMENT_LOCALE) return {};
  return {
    title: t(termsContent.title, locale),
    description: t(termsContent.lead, locale),
    alternates: alternates(locale, "termos"),
  };
}

export default async function TermsOfSaleEnPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale) || locale !== SEGMENT_LOCALE) notFound();

  return <TermsOfSale locale={locale} />;
}
