import Link from "next/link";
import { ArrowRight, Clock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Media } from "@/components/media";
import type { Locale } from "@/i18n/config";
import { t } from "@/i18n/config";
import type { Experience } from "@/content/experiences";
import { href } from "@/lib/routes";

export function ExperienceCard({
  experience,
  locale,
  learnMore,
}: {
  experience: Experience;
  locale: Locale;
  learnMore: string;
}) {
  const link = href(locale, "experiencias", experience.slug);
  return (
    <Card className="group relative overflow-hidden pt-0 transition-shadow hover:shadow-md">
      <Link href={link} aria-label={t(experience.title, locale)}>
        <Media
          src={experience.image}
          seed={experience.slug}
          label={t(experience.imageAlt, locale)}
          rounded={false}
          className="aspect-4/3 w-full"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        />
      </Link>
      <div className="flex flex-1 flex-col px-6">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="gap-1 font-normal">
            <Clock className="h-3 w-3" />
            {t(experience.duration, locale)}
          </Badge>
        </div>
        <h3 className="mt-3 text-xl font-semibold">
          <Link href={link} className="after:absolute after:inset-0">
            {t(experience.title, locale)}
          </Link>
        </h3>
        <p className="mt-2 flex-1 text-sm text-muted-foreground">{t(experience.tagline, locale)}</p>
        <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary">
          {learnMore}
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </Card>
  );
}
