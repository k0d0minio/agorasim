import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale, t } from "@/i18n/config";
import { privacyContent } from "@/content/privacy";
import { PrivacyPolicy } from "@/components/privacy-policy";
import { localeForSegment } from "@/lib/routes";
import { alternates } from "@/lib/seo";

/** The English privacy policy. See `../privacidade/page.tsx` for why there are two. */
const SEGMENT_LOCALE = localeForSegment("privacidade", "privacy");

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

export default async function PrivacyPolicyEnPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale) || locale !== SEGMENT_LOCALE) notFound();

  return <PrivacyPolicy locale={locale} />;
}
