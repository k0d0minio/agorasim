import { AlertTriangle } from "lucide-react";
import { t, type Locale } from "@/i18n/config";
import { seller, termsContent } from "@/content/terms";
import { Section } from "@/components/section";

/**
 * The terms-of-sale body, shared by the two route folders that render it
 * (`termos` for PT, `terms` for EN — see `lib/routes.ts`), the same shape as
 * `PrivacyPolicy`.
 *
 * The seller block comes first and as a definition list: a guest who has just
 * been asked for full prepayment is owed a name, a tax number and an address
 * they can find without reading prose. The RNAAT row prints its pending line
 * until the client supplies the number — an honest blank beats a missing row.
 *
 * The draft banner is not decoration: this copy has not been reviewed by anyone
 * qualified. Remove it — and the `TODO(legal)` lines — as part of sign-off.
 */
export function TermsOfSale({ locale }: { locale: Locale }) {
  const c = termsContent;

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
        <section>
          <h2 className="text-2xl font-semibold">{t(c.sellerHeading, locale)}</h2>
          <SellerDetails locale={locale} />
        </section>

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
      </div>
    </Section>
  );
}

/**
 * Who is selling, as a definition list — the terms page's seller block, and
 * the same block the quote page shows above its pay button, so the identity a
 * couple read before paying is the one the terms publish.
 */
export function SellerDetails({ locale }: { locale: Locale }) {
  const c = termsContent;
  const labels = c.sellerLabels;
  return (
    <dl className="mt-4 grid gap-x-6 gap-y-2 text-muted-foreground sm:grid-cols-[max-content_1fr]">
      <dt className="font-medium text-foreground">{t(labels.tradingName, locale)}</dt>
      <dd>{seller.tradingName}</dd>

      <dt className="font-medium text-foreground">{t(labels.legalName, locale)}</dt>
      <dd>
        {seller.legalName} ({t(c.legalNameNote, locale)})
      </dd>

      <dt className="font-medium text-foreground">{t(labels.registrationNumber, locale)}</dt>
      <dd>{seller.registrationNumber}</dd>

      <dt className="font-medium text-foreground">{t(labels.address, locale)}</dt>
      <dd>{seller.address}</dd>

      <dt className="font-medium text-foreground">{t(labels.email, locale)}</dt>
      <dd>
        <a href={`mailto:${seller.email}`} className="hover:text-primary">
          {seller.email}
        </a>
      </dd>

      <dt className="font-medium text-foreground">{t(labels.phone, locale)}</dt>
      <dd>
        {seller.phones.map((contact, i) => (
          <span key={contact.phone}>
            {i > 0 ? " · " : null}
            <a href={`tel:${contact.phone}`} className="hover:text-primary">
              {contact.name} {contact.phoneDisplay}
            </a>
          </span>
        ))}
      </dd>

      <dt className="font-medium text-foreground">{t(labels.rnaat, locale)}</dt>
      <dd>{seller.rnaat ?? t(c.rnaatPending, locale)}</dd>
    </dl>
  );
}
