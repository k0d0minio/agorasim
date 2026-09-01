import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertCircle, CalendarX2, HelpCircle } from "lucide-react";

import { bookingEmails } from "@/content/emails";
import { cancellationContent } from "@/content/cancellation";
import { departureLabel } from "@/content/logistics";
import { site } from "@/content/site";
import { isLocale, t, type Locale } from "@/i18n/config";
import { BUSINESS_TIME_ZONE, formatDay } from "@/lib/availability";
import type { Booking } from "@/db";
import { resolveCancellation } from "@/lib/booking-cancellation";
import { bookingRef } from "@/lib/bookings";
import { formatPrice } from "@/lib/money";
import { toTelHref, toWhatsAppHref } from "@/lib/phone";
import { CANCEL_VIEW_RATE_LIMIT, rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request-ip";
import { href } from "@/lib/routes";
import { CancelBookingForm } from "@/components/cancel-booking-form";
import { Section } from "@/components/section";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

/**
 * Reads one guest's live booking through a credential in the path. Never
 * prerendered, never cached — the ISR default that covers the rest of the
 * public site would write one guest's booking into a shared HTML cache.
 */
export const dynamic = "force-dynamic";

/**
 * The cancel link from the confirmation email.
 *
 * **Deliberately not in `lib/routes.ts`**, on the same reasoning as
 * `/reservar/confirmacao`: it is transactional, reached once, from an email,
 * and it carries a secret in its path. It has no place in the nav, the sitemap
 * or the hreflang set — and `noindex, nofollow` keeps it out of search results
 * if the URL ever turns up in a referrer log or a shared screenshot.
 *
 * **Rendering is a read; only the form writes.** Everything below is a lookup.
 * A crawler, a mail client prefetching links, or WhatsApp generating a preview
 * will all render this page, and none of them can cancel anything — that takes
 * a POST from the confirm step in `components/cancel-booking-form.tsx`.
 *
 * **Four outcomes, and one of them is silent.** A live booking outside 48 hours
 * gets the summary and the button; inside 48 hours gets phones and WhatsApp;
 * a departed tour gets a different refusal; and everything else — unknown
 * token, spent token, rotated secret, unconfirmed booking — gets one neutral
 * page that reveals nothing about whether a booking exists (see
 * `content/cancellation.ts`).
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function CancelBookingPage({
  params,
}: {
  params: Promise<{ locale: string; token: string }>;
}) {
  const { locale, token } = await params;
  if (!isLocale(locale)) notFound();
  const l: Locale = locale;
  const c = cancellationContent;

  const state = await resolve(token, l);

  return (
    <Section>
      <div className="mx-auto max-w-xl">
        {state.kind === "cancellable" ? (
          <Card>
            <CardContent className="p-6">
              <h1 className="text-2xl font-semibold tracking-tight">{t(c.title, l)}</h1>
              <p className="mt-2 text-muted-foreground">{t(c.lead, l)}</p>

              <p className="mt-4 text-sm font-medium">{t(c.detailsHeading, l)}</p>
              <dl className="mt-2 space-y-2 border-t pt-4 text-sm">
                <Row
                  label={t(bookingEmails.guest.labels.reference, l)}
                  value={bookingRef(state.booking.id)}
                />
                <Row
                  label={t(bookingEmails.guest.labels.date, l)}
                  value={state.date}
                />
                <Row
                  label={t(bookingEmails.guest.labels.departure, l)}
                  value={state.departure}
                />
                <Row
                  label={t(bookingEmails.guest.labels.party, l)}
                  value={String(state.booking.partySize)}
                />
                <Row label={t(bookingEmails.guest.labels.total, l)} value={state.total} />
              </dl>

              <p className="mt-4 text-sm text-muted-foreground">
                {fill(t(c.refundNote, l), { total: state.total })}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                {fill(t(c.deadlineNote, l), { deadline: state.deadline })}
              </p>

              <CancelBookingForm locale={l} token={token} />
            </CardContent>
          </Card>
        ) : state.kind === "too-late" ? (
          <Panel
            icon={<AlertCircle className="size-5" />}
            title={t(c.tooLate.title, l)}
            lead={t(c.tooLate.lead, l)}
          >
            <p className="mt-4 text-sm text-muted-foreground">{t(c.tooLate.note, l)}</p>
            <p className="mt-6 text-sm font-medium">{t(c.tooLate.contactHeading, l)}</p>
            <ul className="mt-2 space-y-2 text-sm">
              {site.contacts.map((contact) => (
                <li key={contact.phone} className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="text-muted-foreground">{contact.name}</span>
                  <a className="font-medium underline hover:text-primary" href={toTelHref(contact.phone) ?? undefined}>
                    {contact.phoneDisplay}
                  </a>
                  {toWhatsAppHref(contact.phone) ? (
                    <a
                      className="text-muted-foreground underline hover:text-primary"
                      href={toWhatsAppHref(contact.phone)!}
                      // A third-party destination opened from a page that had a
                      // booking on it: no referrer, no window handle back.
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {t(c.tooLate.whatsApp, l)}
                    </a>
                  ) : null}
                </li>
              ))}
            </ul>
          </Panel>
        ) : state.kind === "departed" ? (
          <Panel
            icon={<CalendarX2 className="size-5" />}
            title={t(c.departed.title, l)}
            lead={t(c.departed.lead, l)}
          />
        ) : (
          <Panel
            icon={<HelpCircle className="size-5" />}
            title={t(c.unknown.title, l)}
            lead={t(c.unknown.lead, l)}
          />
        )}

        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild size="lg" variant="outline">
            <Link href={href(l, "home")}>{t(c.backHome, l)}</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href={href(l, "contactos")}>{t(c.contactUs, l)}</Link>
          </Button>
        </div>
      </div>
    </Section>
  );
}

/** What the page renders, with everything already formatted for reading. */
type PageState =
  | {
      kind: "cancellable";
      booking: Booking;
      date: string;
      departure: string;
      total: string;
      /** "quinta, 13 de agosto, 10:00" — the deadline, in Lisbon time. */
      deadline: string;
    }
  | { kind: "too-late" | "departed" | "unknown" };

/**
 * Resolve the token, throttled.
 *
 * **Every failure resolves to `unknown`**, including a database error: this
 * page cannot tell a guest what went wrong without telling anyone holding a
 * link the same thing, and "this link no longer works, talk to us" is both true
 * and safe for all of them.
 *
 * The throttle is on the read as well as the write, because the read is what
 * costs an HMAC and a query — see `lib/rate-limit.ts`.
 */
async function resolve(token: string, locale: Locale): Promise<PageState> {
  const ip = await clientIp();
  const throttle = await rateLimit(`cancel-view:${ip}`, CANCEL_VIEW_RATE_LIMIT);
  if (!throttle.allowed) {
    console.warn(`[cancel] throttled view from ${ip}`);
    return { kind: "unknown" };
  }

  try {
    const resolved = await resolveCancellation(token);
    if (resolved.kind !== "cancellable") {
      return { kind: resolved.kind === "unknown" ? "unknown" : resolved.kind };
    }

    const { booking, window } = resolved;

    return {
      kind: "cancellable",
      booking,
      date: formatDay(booking.date, locale),
      departure: t(departureLabel(booking.experienceSlug, booking.slot), locale),
      total: formatPrice(booking.amountCents, locale, booking.currency),
      deadline: formatDeadline(window.deadline, locale),
    };
  } catch (err) {
    console.error("[cancel] could not resolve a cancellation link", err);
    return { kind: "unknown" };
  }
}

/**
 * The deadline as a guest would read it, in Lisbon time.
 *
 * The timezone is stated explicitly rather than left to the server's locale:
 * this is a deadline with a refund on the other side of it, and it must mean
 * the same thing to a guest reading it in Lisbon and one reading it in Berlin.
 */
function formatDeadline(deadline: Date | null, locale: Locale): string {
  if (!deadline) return "—";
  return new Intl.DateTimeFormat(locale === "pt" ? "pt-PT" : "en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: BUSINESS_TIME_ZONE,
  }).format(deadline);
}

/** The one placeholder the copy in this page substitutes. */
function fill(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? values[key] : match,
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}

function Panel({
  icon,
  title,
  lead,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  lead: string;
  children?: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 text-muted-foreground">{icon}</span>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
            <p className="mt-2 text-muted-foreground">{lead}</p>
            {children}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
