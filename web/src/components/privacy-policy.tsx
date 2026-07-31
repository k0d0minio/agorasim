import { AlertTriangle } from "lucide-react";
import { t, type Locale } from "@/i18n/config";
import { controller, privacyContent } from "@/content/privacy";
import { Section } from "@/components/section";

/**
 * The privacy policy body, shared by the two route folders that render it
 * (`privacidade` for PT, `privacy` for EN — see `lib/routes.ts`).
 *
 * The draft banner is not decoration: this copy has not been reviewed by anyone
 * qualified, and shipping unreviewed legal text without saying so would be the
 * one genuinely dishonest thing on the page. Remove the banner — and the
 * `TODO(legal)` lines it refers to — as part of sign-off, not before.
 */
export function PrivacyPolicy({ locale }: { locale: Locale }) {
  const c = privacyContent;

  return (
    <Section>
      <div className="max-w-2xl">
        <h1 className="text-4xl font-semibold sm:text-5xl">{t(c.title, locale)}</h1>
        <p className="mt-6 text-lg text-muted-foreground">{t(c.lead, locale)}</p>
        <p className="mt-4 text-sm text-muted-foreground">
          {t(c.lastUpdatedLabel, locale)}: {t(c.lastUpdated, locale)}
        </p>
      </div>

      <div
        role="note"
        className="mt-8 flex max-w-2xl items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
      >
        <AlertTriangle className="mt-0.5 size-4 shrink-0" />
        <p>{t(c.draftNotice, locale)}</p>
      </div>

      <div className="mt-12 max-w-2xl space-y-10">
        {t(c.sections, locale).map((section) => (
          <section key={section.heading}>
            <h2 className="text-2xl font-semibold">{section.heading}</h2>
            <div className="mt-4 space-y-4 text-muted-foreground">
              {section.body.map((paragraph, i) => (
                <p key={i}>{paragraph}</p>
              ))}
            </div>
          </section>
        ))}

        <section>
          <h2 className="text-2xl font-semibold">
            {locale === "pt" ? "Contactos" : "Contact"}
          </h2>
          <ul className="mt-4 space-y-2 text-muted-foreground">
            <li>
              {controller.tradingName} —{" "}
              <a href={`mailto:${controller.email}`} className="hover:text-primary">
                {controller.email}
              </a>
            </li>
            <li>
              <a
                href={controller.supervisoryAuthority.url}
                className="hover:text-primary"
                rel="noopener noreferrer"
                target="_blank"
              >
                {controller.supervisoryAuthority.name}
              </a>
            </li>
          </ul>
        </section>
      </div>
    </Section>
  );
}
