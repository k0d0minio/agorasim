import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Copy, Gift, Link2, Share2, Sparkles } from "lucide-react";
import { isLocale, t, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { referralContent } from "@/content/referral";
import { Section, SectionHeading } from "@/components/section";
import { InDevBanner } from "@/components/in-dev-banner";
import { BookingButton } from "@/components/booking-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { alternates } from "@/lib/seo";

const stepIcons = [Link2, Share2, Gift];

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return {
    title: t(referralContent.title, locale),
    description: t(referralContent.lead, locale),
    alternates: alternates(locale, "recomendar"),
    // Preview page — keep out of the index until the feature ships.
    robots: { index: false, follow: false },
  };
}

/** Refer-a-friend landing (proposal Feature 6) — design preview. */
export default async function ReferralPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const l: Locale = locale;
  const c = referralContent;
  const dict = getDictionary(l);

  return (
    <>
      <Section className="pb-0">
        <div className="mx-auto max-w-2xl text-center">
          <p className="mb-2 inline-flex items-center gap-1.5 text-sm font-semibold tracking-wider text-primary uppercase">
            <Sparkles className="size-3.5" />
            {l === "pt" ? "Passa a palavra" : "Word of mouth"}
          </p>
          <h1 className="text-4xl font-semibold sm:text-5xl">{t(c.title, l)}</h1>
          <p className="mt-6 text-lg text-muted-foreground">{t(c.lead, l)}</p>
        </div>
        <InDevBanner locale={l} body={c.inDev} showContacts={false} className="mx-auto mt-8 max-w-2xl" />
      </Section>

      {/* How it works */}
      <Section>
        <div className="mx-auto max-w-4xl">
          <SectionHeading title={t(c.how.title, l)} className="mx-auto text-center" />
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {c.how.steps.map((step, i) => {
              const Icon = stepIcons[i] ?? Gift;
              return (
                <Card key={i}>
                  <CardContent className="flex flex-col items-center p-5 text-center">
                    <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Icon className="size-5" />
                    </div>
                    <p className="mt-3 font-heading text-lg font-semibold">{t(step.title, l)}</p>
                    <p className="mt-1.5 text-sm text-muted-foreground">{t(step.body, l)}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </Section>

      {/* Rewards */}
      <Section muted>
        <div className="mx-auto max-w-3xl">
          <SectionHeading title={t(c.rewards.title, l)} className="mx-auto text-center" />
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {[c.rewards.friend, c.rewards.you].map((reward, i) => (
              <Card key={i} className="border-primary/20">
                <CardContent className="p-6 text-center">
                  <p className="text-sm font-semibold tracking-wider text-primary uppercase">
                    {t(reward.label, l)}
                  </p>
                  <p className="mt-2 font-heading text-3xl font-semibold">{t(reward.value, l)}</p>
                  <p className="mt-2 text-sm text-muted-foreground">{t(reward.note, l)}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          <p className="mt-3 text-center text-xs text-muted-foreground">
            {t(c.rewards.exampleNote, l)}
          </p>
        </div>
      </Section>

      {/* Personal link preview */}
      <Section>
        <div className="mx-auto max-w-xl">
          <Card>
            <CardContent className="p-6">
              <p className="font-heading text-lg font-semibold">{t(c.linkCard.title, l)}</p>
              <div className="mt-4 flex items-center gap-2">
                <code className="flex-1 truncate rounded-lg border border-dashed border-border bg-muted/60 px-3 py-2.5 text-sm text-muted-foreground">
                  {c.linkCard.example}
                </code>
                <Button type="button" variant="outline" disabled aria-label={t(c.linkCard.copy, l)}>
                  <Copy className="size-4" />
                  <span className="hidden sm:inline">{t(c.linkCard.copy, l)}</span>
                </Button>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">{t(c.linkCard.soon, l)}</p>
            </CardContent>
          </Card>
        </div>
      </Section>

      {/* CTA for not-yet guests */}
      <Section muted>
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold sm:text-4xl">{t(c.cta.title, l)}</h2>
          <p className="mt-4 text-lg text-muted-foreground">{t(c.cta.body, l)}</p>
          <div className="mt-8 flex justify-center">
            <BookingButton locale={l} label={dict.cta.bookExperience} />
          </div>
        </div>
      </Section>
    </>
  );
}
