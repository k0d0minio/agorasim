import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CheckCircle2, Clock, HelpCircle, Mail, Phone } from "lucide-react";

import { paymentLinkContent } from "@/content/payment-link";
import { site } from "@/content/site";
import { isLocale, t, type Locale } from "@/i18n/config";
import { fillTemplate } from "@/lib/fill-template";
import {
  catalogueTitles,
  paymentLinkState,
  paymentLinkSummary,
  resolvePaymentLink,
  type PaymentLinkState,
  type PaymentLinkSummary,
} from "@/lib/payment-link";
import { QUOTE_LOOKUP_RATE_LIMIT, rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request-ip";
import { PaymentLinkPayForm } from "@/components/payment-link-pay-form";
import { QuoteNotice } from "@/components/quote-notice";
import { Section } from "@/components/section";
import { Card, CardContent } from "@/components/ui/card";

/**
 * The customer's payment link: `/[locale]/reservar/pagar/<token>`.
 *
 * **Never cached, never prerendered, never indexed.** The URL carries a
 * credential and the page renders one customer's booking, as the quote page
 * does (`orcamento/[token]`). The path is built by `paymentLinkPath` in
 * `lib/payment-link.ts` and is deliberately not in `lib/routes.ts`: no nav,
 * no sitemap, no hreflang.
 *
 * **What the customer reads before paying:** the tour, the day, the departure,
 * the party, the add-ons and the total — the booking the team registered — and
 * that it holds nothing until it is paid. Then the one button, which re-checks
 * the departure before it opens Stripe's form (`PaymentLinkPayForm`).
 *
 * A link that does not work — unknown, malformed, or replaced by a resend —
 * gets one panel at 200, which says nothing about whether it ever existed. A
 * cancelled or past booking gets its own panel, so the customer knows to call.
 */
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: t(paymentLinkContent.metaTitle, isLocale(locale) ? locale : "pt"),
    robots: { index: false, follow: false },
  };
}

export default async function PaymentLinkPage({
  params,
}: {
  params: Promise<{ locale: string; token: string }>;
}) {
  const { locale, token } = await params;
  if (!isLocale(locale)) notFound();
  const l: Locale = locale;

  // Throttled on the way in, before the token is hashed or looked up.
  const ip = await clientIp();
  const throttle = await rateLimit(`link-lookup:${ip}`, QUOTE_LOOKUP_RATE_LIMIT);
  if (!throttle.allowed) {
    console.warn(
      `[link-page] throttled lookup from ${ip} — retry in ${throttle.retryAfterSeconds}s`,
    );
    return <Panel locale={l} kind="throttled" />;
  }

  const found = await resolvePaymentLink(token);
  if (!found) return <Panel locale={l} kind="invalid" />;

  const summary = paymentLinkSummary(found.booking, await catalogueTitles(), l);
  return (
    <LinkView
      locale={l}
      token={token}
      name={found.lead?.name ?? null}
      summary={summary}
      state={paymentLinkState(found.booking)}
    />
  );
}

function LinkView({
  locale,
  token,
  name,
  summary,
  state,
}: {
  locale: Locale;
  token: string;
  name: string | null;
  summary: PaymentLinkSummary;
  state: PaymentLinkState;
}) {
  const c = paymentLinkContent;

  return (
    <Section>
      <div className="mx-auto max-w-2xl space-y-8">
        <header>
          <p className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
            {fillTemplate(t(c.eyebrow, locale), { ref: summary.ref })}
          </p>
          <h1 className="mt-2 font-heading text-3xl font-semibold sm:text-4xl">
            {name ? fillTemplate(t(c.greeting, locale), { name }) : t(c.metaTitle, locale)}
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">{t(c.lead[state], locale)}</p>
        </header>

        <Card>
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold">{t(c.detailsHeading, locale)}</h2>
            <dl className="mt-4 space-y-2 text-sm">
              <Row label={t(c.labels.reference, locale)} value={summary.ref} mono />
              <Row label={t(c.labels.experience, locale)} value={summary.experience} />
              <Row label={t(c.labels.date, locale)} value={summary.date} />
              <Row label={t(c.labels.departure, locale)} value={summary.departure} />
              <Row label={t(c.labels.party, locale)} value={summary.party} />
              {summary.addOns.length > 0 ? (
                <Row label={t(c.labels.addOns, locale)} value={summary.addOns.join(", ")} />
              ) : null}
            </dl>
            <div className="mt-4 flex justify-between gap-4 border-t pt-4 text-base font-semibold">
              <span>{t(c.labels.total, locale)}</span>
              <span className="tabular-nums text-primary">{summary.total}</span>
            </div>
          </CardContent>
        </Card>

        <div aria-live="polite">
          {state === "payable" ? (
            <PaymentLinkPayForm locale={locale} token={token} amount={summary.total} />
          ) : state === "paid" ? (
            <QuoteNotice
              icon={<CheckCircle2 className="size-5" />}
              title={t(c.lead.paid, locale)}
              body={t(c.confirming.body, locale)}
            />
          ) : (
            <QuoteNotice
              icon={<Clock className="size-5" />}
              title={t(c.closed.title, locale)}
              body={t(c.closed.body, locale)}
            />
          )}
        </div>

        <Contacts locale={locale} />
      </div>
    </Section>
  );
}

function Row({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={mono ? "font-mono font-medium tracking-wider" : "text-right font-medium"}>
        {value}
      </dd>
    </div>
  );
}

function Contacts({ locale }: { locale: Locale }) {
  const c = paymentLinkContent;
  return (
    <section aria-labelledby="link-contacts" className="border-t pt-6">
      <h2 id="link-contacts" className="text-lg font-semibold">
        {t(c.contactsHeading, locale)}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">{t(c.contactsBody, locale)}</p>
      <ul className="mt-3 flex flex-wrap gap-3 text-sm">
        {site.contacts.map((contact) => (
          <li key={contact.phone}>
            <a
              href={`tel:${contact.phone}`}
              className="inline-flex min-h-11 items-center gap-2 rounded-lg border px-4 hover:border-primary hover:text-primary"
            >
              <Phone className="size-4" />
              {contact.name} {contact.phoneDisplay}
            </a>
          </li>
        ))}
        <li>
          <a
            href={`mailto:${site.email}`}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg border px-4 hover:border-primary hover:text-primary"
          >
            <Mail className="size-4" />
            {site.email}
          </a>
        </li>
      </ul>
    </section>
  );
}

/** Unknown, malformed or replaced share one panel; throttled gets its own copy. */
function Panel({ locale, kind }: { locale: Locale; kind: "invalid" | "throttled" }) {
  const copy = paymentLinkContent[kind];
  return (
    <Section>
      <div className="mx-auto max-w-xl space-y-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex size-11 items-center justify-center rounded-xl bg-muted text-muted-foreground">
              {kind === "throttled" ? <Clock className="size-5" /> : <HelpCircle className="size-5" />}
            </div>
            <h1 className="mt-4 font-heading text-2xl font-semibold">{t(copy.title, locale)}</h1>
            <p className="mt-2 text-muted-foreground">{t(copy.body, locale)}</p>
          </CardContent>
        </Card>
        <Contacts locale={locale} />
      </div>
    </Section>
  );
}
