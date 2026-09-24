import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Clock, CheckCircle2, HelpCircle, Mail, Phone } from "lucide-react";

import { quotePageContent } from "@/content/quote-page";
import { site } from "@/content/site";
import { termsContent, termsSection } from "@/content/terms";
import type { QuotePayment } from "@/db";
import { isLocale, t, type Locale } from "@/i18n/config";
import { formatDay, todayKey } from "@/lib/availability";
import { formatPrice } from "@/lib/money";
import {
  readQuoteLead,
  reconcileQuoteReturn,
  resolveQuoteToken,
  type QuoteReturn,
} from "@/lib/quote-checkout";
import {
  BALANCE_DUE_DAYS_BEFORE,
  dueInstalment,
  getQuote,
  quoteRef,
  type QuoteWithPayments,
} from "@/lib/quotes";
import { QUOTE_LOOKUP_RATE_LIMIT, rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request-ip";
import { href } from "@/lib/routes";
import { QuoteNotice } from "@/components/quote-notice";
import { QuotePayForm } from "@/components/quote-pay-form";
import { Section } from "@/components/section";
import { SellerDetails } from "@/components/terms-of-sale";
import { Card, CardContent } from "@/components/ui/card";

/**
 * The couple's quote: `/[locale]/orcamento/<token>` (D25).
 *
 * **Never cached, never prerendered.** The URL carries a credential and the
 * page renders one couple's event — the one thing `AGENTS.md` says must not go
 * on a public, ISR-cached page. The path is built by `quotePath` in
 * `lib/quote-token.ts`, which the quote-sent email and this folder agree on,
 * and it is deliberately not in `lib/routes.ts`: no nav, no sitemap, no
 * hreflang, and a `noindex` so a URL found in a referrer log is not a search
 * result. The token does not leave the tab either — the site's
 * `strict-origin-when-cross-origin` referrer policy sends other sites the
 * origin and never the path (`lib/security-headers.ts`).
 *
 * **What the couple read before they pay** (DL 24/2014 art. 4(1), 17(1)(l)):
 * the quote — lines, total, deposit, balance and its date — then the events
 * section of the terms, the seller and the complaints section, all rendered
 * from `terms.ts` itself, then the one button. The receipt emails carry the
 * same events section, so the page and the durable copy cannot disagree.
 *
 * **A link that no longer works** — unknown, malformed, replaced by a new
 * version, cancelled, or throttled — gets one neutral panel, so it says nothing
 * about whether the quote ever existed. It is served as a `noindex` page rather
 * than a 404 status: the locale's `loading.tsx` streams this route, and a
 * streamed response has sent its 200 before the lookup finishes (Next's
 * streaming note).
 *
 * **It also reconciles**, as `/reservar/confirmacao` does. Stripe returns the
 * couple here with `?session_id=`; the page asks Stripe whether that session —
 * if it is this quote's — is paid, and if so runs the webhook's own idempotent
 * recording. Whichever of the two arrives first records it and sends the
 * receipts; the other finds it done.
 */
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: t(quotePageContent.metaTitle, isLocale(locale) ? locale : "pt"),
    robots: { index: false, follow: false },
  };
}

export default async function QuotePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; token: string }>;
  searchParams: Promise<{ session_id?: string | string[] }>;
}) {
  const { locale, token } = await params;
  if (!isLocale(locale)) notFound();
  const l: Locale = locale;

  // Throttled on the way in, before the token is hashed or looked up — and a
  // throttled caller sees the same panel a wrong token does.
  const ip = await clientIp();
  const throttle = await rateLimit(`quote-lookup:${ip}`, QUOTE_LOOKUP_RATE_LIMIT);
  if (!throttle.allowed) {
    console.warn(
      `[quote-page] throttled lookup from ${ip} — retry in ${throttle.retryAfterSeconds}s`,
    );
    return <InvalidPanel locale={l} />;
  }

  let quote = await resolveQuoteToken(token);
  if (!quote) return <InvalidPanel locale={l} />;

  // A string or nothing: a repeated `?session_id=` arrives as an array, and
  // the query string is the visitor's to type.
  const rawSessionId = (await searchParams).session_id;
  const sessionId = typeof rawSessionId === "string" ? rawSessionId.trim() : undefined;
  const returned = sessionId ? await reconcileQuoteReturn(sessionId, quote.id) : null;
  if (returned) quote = (await getQuote(quote.id)) ?? quote;

  const lead = quote.tourRequestId ? await readQuoteLead(quote.tourRequestId) : null;

  // The return banner only while the instalment it is about is still unpaid;
  // once it is, the receipt state says so on its own.
  const returnState: QuoteReturn =
    returned &&
    quote.payments.find((payment) => payment.id === returned.paymentId)?.status !== "paid"
      ? returned
      : null;

  return (
    <QuoteView
      locale={l}
      token={token}
      quote={quote}
      name={lead?.name ?? null}
      returnState={returnState}
    />
  );
}

function fill(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? values[key] : match,
  );
}

function QuoteView({
  locale,
  token,
  quote,
  name,
  returnState,
}: {
  locale: Locale;
  token: string;
  quote: QuoteWithPayments;
  name: string | null;
  returnState: QuoteReturn;
}) {
  const c = quotePageContent;
  const money = (cents: number) => formatPrice(cents, locale, quote.currency);
  const ref = quoteRef(quote.id);
  const due = dueInstalment(quote);
  const deposit = quote.payments.find((payment) => payment.kind === "deposit");
  const balance = quote.payments.find((payment) => payment.kind === "balance");
  const events = termsSection("events", locale);
  const complaints = termsSection("complaints", locale);

  const lead =
    quote.status === "paid" || due.kind === "settled"
      ? c.lead.paid
      : quote.status === "deposit_paid"
        ? c.lead.depositPaid
        : c.lead.sent;

  return (
    <Section>
      <div className="mx-auto max-w-2xl space-y-8">
        <header>
          <p className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
            {fill(t(c.eyebrow, locale), { ref })}
          </p>
          <h1 className="mt-2 font-heading text-3xl font-semibold sm:text-4xl">
            {name ? fill(t(c.greeting, locale), { name }) : t(c.metaTitle, locale)}
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">{t(lead, locale)}</p>
        </header>

        <Card>
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold">{t(c.detailsHeading, locale)}</h2>
            <dl className="mt-4 space-y-2 text-sm">
              <Row label={t(c.labels.reference, locale)} value={ref} mono />
              <Row label={t(c.labels.date, locale)} value={formatDay(quote.eventDate, locale)} />
              {quote.venue ? <Row label={t(c.labels.venue, locale)} value={quote.venue} /> : null}
            </dl>
            <ul className="mt-4 space-y-2 border-t pt-4 text-sm">
              {quote.lineItems.map((line, index) => (
                <li key={index} className="flex justify-between gap-4">
                  <span>
                    {line.quantity > 1
                      ? fill(c.lineQuantity, { quantity: String(line.quantity), label: line.label })
                      : line.label}
                  </span>
                  <span className="font-medium tabular-nums">
                    {money(line.unitCents * line.quantity)}
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex justify-between gap-4 border-t pt-4 text-base font-semibold">
              <span>{t(c.labels.total, locale)}</span>
              <span className="tabular-nums text-primary">{money(quote.totalCents)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold">{t(c.paymentsHeading, locale)}</h2>
            <ul className="mt-4 space-y-3 text-sm">
              {deposit ? (
                <Instalment
                  locale={locale}
                  label={fill(t(c.depositLabel, locale), { percent: String(quote.depositPercent) })}
                  amount={money(deposit.amountCents)}
                  payment={deposit}
                />
              ) : null}
              {balance && balance.amountCents > 0 ? (
                <Instalment
                  locale={locale}
                  label={t(c.instalmentNames.balance, locale)}
                  amount={money(balance.amountCents)}
                  payment={balance}
                />
              ) : null}
            </ul>
          </CardContent>
        </Card>

        <section aria-labelledby="quote-terms" className="space-y-6">
          <div>
            <h2 id="quote-terms" className="text-2xl font-semibold">
              {t(c.termsHeading, locale)}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {fill(t(c.termsVersion, locale), { date: t(termsContent.lastUpdated, locale) })}
            </p>
            {quote.acceptedTermsVersion ? (
              <p className="mt-1 text-sm text-muted-foreground">
                {fill(t(c.acceptedVersion, locale), {
                  version: formatDay(quote.acceptedTermsVersion, locale),
                })}
              </p>
            ) : null}
          </div>

          <TermsBlock heading={events.heading} body={events.body} />

          <div>
            <h3 className="text-lg font-semibold">{t(termsContent.sellerHeading, locale)}</h3>
            <SellerDetails locale={locale} />
          </div>

          <TermsBlock heading={complaints.heading} body={complaints.body} />

          <p className="text-sm">
            <Link href={href(locale, "termos")} className="underline hover:text-primary">
              {t(c.fullTermsLink, locale)}
            </Link>
          </p>
        </section>

        <div aria-live="polite">
          {returnState ? (
            <QuoteNotice
              icon={
                returnState.kind === "confirming" ? (
                  <CheckCircle2 className="size-5" />
                ) : (
                  <Clock className="size-5" />
                )
              }
              title={t(c[returnState.kind].title, locale)}
              body={t(c[returnState.kind].body, locale)}
            />
          ) : due.kind === "due" ? (
            <QuotePayForm
              locale={locale}
              token={token}
              label={fill(
                t(due.payment.kind === "balance" ? c.pay.balance : c.pay.deposit, locale),
                { amount: money(due.payment.amountCents) },
              )}
            />
          ) : due.kind === "not-yet" ? (
            <QuoteNotice
              icon={<Clock className="size-5" />}
              title={fill(t(c.notYet.title, locale), { date: formatDay(due.dueDate, locale) })}
              body={fill(t(c.notYet.body, locale), { days: String(BALANCE_DUE_DAYS_BEFORE) })}
            />
          ) : null}
        </div>

        <Contacts locale={locale} />
      </div>
    </Section>
  );
}

function Instalment({
  locale,
  label,
  amount,
  payment,
}: {
  locale: Locale;
  label: string;
  amount: string;
  payment: QuotePayment;
}) {
  const s = quotePageContent.instalmentState;
  const state =
    payment.status === "paid"
      ? fill(t(s.paidOn, locale), {
          date: payment.paidAt ? formatDay(todayKey(payment.paidAt), locale) : "",
        })
      : payment.status === "cancelled"
        ? t(s.settled, locale)
        : payment.status === "refunded"
          ? t(s.refunded, locale)
          : payment.dueDate
            ? fill(t(s.dueBy, locale), { date: formatDay(payment.dueDate, locale) })
            : t(s.toPay, locale);

  return (
    <li className="flex justify-between gap-4">
      <span>
        <span className="block font-medium">{label}</span>
        <span className="block text-muted-foreground">{state}</span>
      </span>
      <span className="font-medium tabular-nums">{amount}</span>
    </li>
  );
}

function TermsBlock({ heading, body }: { heading: string; body: readonly string[] }) {
  return (
    <div>
      <h3 className="text-lg font-semibold">{heading}</h3>
      <div className="mt-3 space-y-3 text-muted-foreground">
        {body.map((paragraph, index) => (
          <p key={index}>{paragraph}</p>
        ))}
      </div>
    </div>
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
  const c = quotePageContent;
  return (
    <section aria-labelledby="quote-contacts" className="border-t pt-6">
      <h2 id="quote-contacts" className="text-lg font-semibold">
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

/** Unknown, malformed, replaced, cancelled or throttled — one neutral answer. */
function InvalidPanel({ locale }: { locale: Locale }) {
  const c = quotePageContent;
  return (
    <Section>
      <div className="mx-auto max-w-xl space-y-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex size-11 items-center justify-center rounded-xl bg-muted text-muted-foreground">
              <HelpCircle className="size-5" />
            </div>
            <h1 className="mt-4 font-heading text-2xl font-semibold">
              {t(c.invalid.title, locale)}
            </h1>
            <p className="mt-2 text-muted-foreground">{t(c.invalid.body, locale)}</p>
          </CardContent>
        </Card>
        <Contacts locale={locale} />
      </div>
    </Section>
  );
}
