import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, Clock, HelpCircle } from "lucide-react";

import { bookingContent } from "@/content/booking";
import { isLocale, t, type Locale } from "@/i18n/config";
import { formatDay } from "@/lib/availability";
import { confirmPaidBooking } from "@/lib/booking-checkout";
import { bookingRef } from "@/lib/bookings";
import { listCatalogue } from "@/lib/experience-catalogue";
import { formatPrice } from "@/lib/money";
import { href } from "@/lib/routes";
import { isStripeConfigured, stripe } from "@/lib/stripe";
import { Section } from "@/components/section";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

/** Reads a live Stripe session — never prerendered, never cached. */
export const dynamic = "force-dynamic";

/**
 * Where Stripe sends a guest after they pay.
 *
 * Deliberately not in `lib/routes.ts`: it is a transactional page reached once,
 * from an external redirect, with a session id in the query. It has no place in
 * the nav, the sitemap or the hreflang set, and it carries a `noindex` so a
 * crawler that finds the URL in a referrer log does not put "Booking confirmed"
 * into search results.
 *
 * **It also reconciles.** The webhook is the authority on payment, but it can
 * be late, and on a fresh deployment it can be misconfigured — which would
 * leave a guest who has paid staring at "confirming…" forever. So this page
 * asks Stripe directly whether the session is paid and, if it is, runs the same
 * idempotent confirmation the webhook runs. Whichever gets there first does the
 * work and sends the emails; the other finds it already done.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function BookingConfirmationPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const l: Locale = locale;
  const c = bookingContent.confirmation;

  const sessionId = (await searchParams).session_id?.trim();

  const state = sessionId ? await resolve(sessionId, l) : { kind: "unknown" as const };

  return (
    <Section>
      <div className="mx-auto max-w-xl">
        {state.kind === "confirmed" ? (
          <Panel
            tone="good"
            icon={<CheckCircle2 className="size-5" />}
            title={t(c.title, l)}
            lead={t(c.lead, l)}
          >
            <dl className="mt-6 space-y-2 border-t pt-4 text-sm">
              <Row label={t(c.reference, l)} value={state.ref} />
              <Row label={t(bookingContent.labels.experience, l)} value={state.experience} />
              <Row label={t(bookingContent.labels.summary, l)} value={state.date} />
              <Row
                label={t(bookingContent.labels.partySize, l)}
                value={String(state.partySize)}
              />
              <Row label={t(bookingContent.labels.total, l)} value={state.total} />
            </dl>
            <p className="mt-4 text-sm text-muted-foreground">{t(c.emailNote, l)}</p>
          </Panel>
        ) : state.kind === "pending" ? (
          <Panel
            tone="wait"
            icon={<Clock className="size-5" />}
            title={t(c.pendingTitle, l)}
            lead={t(c.pendingLead, l)}
          />
        ) : (
          <Panel
            tone="wait"
            icon={<HelpCircle className="size-5" />}
            title={t(c.unknownTitle, l)}
            lead={t(c.unknownLead, l)}
          />
        )}

        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild size="lg">
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

type ResolvedBooking =
  | {
      kind: "confirmed";
      ref: string;
      date: string;
      experience: string;
      partySize: number;
      total: string;
    }
  | { kind: "pending" }
  | { kind: "unknown" };

/**
 * Work out what actually happened, and finish the job if the webhook hasn't.
 *
 * Every failure here — Stripe unreachable, an unknown session, a database
 * error — resolves to "pending" rather than to an error page. The guest's money
 * has left their account; the worst thing this page can do is tell them
 * something went wrong when it did not.
 */
async function resolve(sessionId: string, locale: Locale): Promise<ResolvedBooking> {
  if (!isStripeConfigured()) return { kind: "unknown" };

  try {
    const session = await stripe().checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== "paid") return { kind: "pending" };

    const catalogue = await listCatalogue();
    const outcome = await confirmPaidBooking({
      sessionId,
      paymentIntentId:
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : (session.payment_intent?.id ?? null),
      catalogue: new Map(catalogue.map((entry) => [entry.slug, entry])),
    });

    if (outcome.status !== "confirmed") return { kind: "pending" };

    const booking = outcome.booking;
    const name = (slug: string) => {
      const entry = catalogue.find((candidate) => candidate.slug === slug);
      return entry ? t(entry.title, locale) : slug;
    };

    return {
      kind: "confirmed",
      ref: bookingRef(booking.id),
      date: formatDay(booking.date, locale),
      experience: [booking.experienceSlug, ...booking.addOns].map(name).join(" · "),
      partySize: booking.partySize,
      total: formatPrice(booking.amountCents, locale, booking.currency),
    };
  } catch (err) {
    console.error(`[checkout] couldn't resolve session ${sessionId}`, err);
    return { kind: "pending" };
  }
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
  tone,
  icon,
  title,
  lead,
  children,
}: {
  tone: "good" | "wait";
  icon: React.ReactNode;
  title: string;
  lead: string;
  children?: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div
          className={
            tone === "good"
              ? "flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary"
              : "flex size-11 items-center justify-center rounded-xl bg-muted text-muted-foreground"
          }
        >
          {icon}
        </div>
        <h1 className="mt-4 font-heading text-2xl font-semibold">{title}</h1>
        <p className="mt-2 text-muted-foreground">{lead}</p>
        {children}
      </CardContent>
    </Card>
  );
}
