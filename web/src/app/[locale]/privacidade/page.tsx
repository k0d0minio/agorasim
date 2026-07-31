import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale, t } from "@/i18n/config";
import { privacyContent } from "@/content/privacy";
import { PrivacyPolicy } from "@/components/privacy-policy";
import { localeForSegment } from "@/lib/routes";
import { alternates } from "@/lib/seo";

/**
 * The Portuguese privacy policy. Its English twin lives at `../privacy`, because
 * this is a new page with no legacy URL to preserve and a localized segment
 * reads better than `/en/privacidade` (see `lib/routes.ts`).
 *
 * Both folders 404 outside their own locale, so the two URLs are never two
 * copies of the same page.
 */
const SEGMENT_LOCALE = localeForSegment("privacidade", "privacidade");

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (locale !== SEGMENT_LOCALE) return {};
  return {
    title: t(privacyContent.title, locale),
    description: t(privacyContent.lead, locale),
    alternates: alternates(locale, "privacidade"),
  };
}

export default async function PrivacyPolicyPtPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale) || locale !== SEGMENT_LOCALE) notFound();

  return <PrivacyPolicy locale={locale} />;
}
