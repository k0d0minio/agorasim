import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale, t } from "@/i18n/config";
import { termsContent } from "@/content/terms";
import { TermsOfSale } from "@/components/terms-of-sale";
import { localeForSegment } from "@/lib/routes";
import { alternates } from "@/lib/seo";

/**
 * The Portuguese terms of sale. Its English twin lives at `../terms`, for the
 * same reason the privacy policy is split: a new page with no legacy URL to
 * preserve, where a localized segment reads better than `/en/termos` (see
 * `lib/routes.ts`).
 *
 * Both folders 404 outside their own locale, so the two URLs are never two
 * copies of the same page.
 */
const SEGMENT_LOCALE = localeForSegment("termos", "termos");

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

export default async function TermsOfSalePtPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale) || locale !== SEGMENT_LOCALE) notFound();

  return <TermsOfSale locale={locale} />;
}
