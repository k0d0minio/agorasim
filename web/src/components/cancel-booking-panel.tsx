"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Clock,
  HelpCircle,
  MessageCircle,
  Phone,
} from "lucide-react";

import { bookingContent } from "@/content/booking";
import { bookingEmails } from "@/content/emails";
import { site } from "@/content/site";
import { t, type Locale } from "@/i18n/config";
import type { GuestBookingSummary } from "@/lib/booking-cancellation";
import { toWhatsAppHref } from "@/lib/phone";
import { href } from "@/lib/routes";
import {
  cancelBookingFromLink,
  type GuestCancelState,
} from "@/app/[locale]/reserva/cancelar/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

/**
 * The guest's cancel page, below the token lookup the server already did.
 *
 * **Confirm before cancel, with "keep" as the default.** The first screen shows
 * the booking and one destructive button; pressing it swaps in a confirmation
 * whose primary action is *Manter reserva*. That ordering is the HIG rule the
 * admin's typed-confirmation dialogs follow for the same reason
 * (`components/admin/delete-submission-dialog.tsx`): the safe answer is the one
 * under the thumb, and the irreversible one has to be chosen. A typed
 * confirmation would be the wrong instrument here — the person is a guest on a
 * phone, not an operator, and the risk is a mis-tap rather than a wrong row.
 *
 * **The server decides, not this component.** Everything here is a rendering of
 * something the action returned; the 48-hour window in particular is re-checked
 * on submit, because a page left open overnight is a page whose answer has
 * expired (`lib/booking-cancellation.ts`).
 */
export function CancelBookingPanel({
  locale,
  token,
  summary,
  open,
}: {
  locale: Locale;
  /** Echoed back on submit — it is already in the URL this page was reached by. */
  token: string;
  summary: GuestBookingSummary;
  /** Whether the 48-hour window was still open when this page was rendered. */
  open: boolean;
}) {
  const c = bookingContent.cancellation;
  const [state, formAction] = useActionState<GuestCancelState, FormData>(
    cancelBookingFromLink,
    { status: "idle" },
  );
  const [confirming, setConfirming] = useState(false);

  if (state.status === "done") {
    return (
      <Panel
        tone="good"
        icon={<CheckCircle2 className="size-5" />}
        title={t(c.doneTitle, locale)}
        lead={t(c.doneLead, locale)}
      >
        <p className="mt-4 text-sm text-muted-foreground">
          {fill(t(c.doneRefund, locale), { amount: state.refund })}
        </p>
        <HomeLinks locale={locale} />
      </Panel>
    );
  }

  if (state.status === "unknown") {
    return <UnknownPanel locale={locale} />;
  }

  // The window closed between the render and the submit — or was already closed
  // and somebody posted the form anyway. Same answer either way.
  if (state.status === "too-late") {
    return <TooLatePanel locale={locale} deadline={state.deadline} />;
  }

  if (!open) {
    return <TooLatePanel locale={locale} deadline={summary.deadline} />;
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex size-11 items-center justify-center rounded-xl bg-muted text-muted-foreground">
          <CalendarDays className="size-5" />
        </div>
        <h1 className="mt-4 font-heading text-2xl font-semibold">
          {t(c.title, locale)}
        </h1>
        <p className="mt-2 text-muted-foreground">{t(c.lead, locale)}</p>

        <h2 className="mt-6 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t(c.detailsHeading, locale)}
        </h2>
        <dl className="mt-2 space-y-2 border-t pt-4 text-sm">
          <Row label={t(bookingEmails.guest.labels.reference, locale)} value={summary.ref} />
          <Row
            label={t(bookingContent.labels.experience, locale)}
            value={summary.experience}
          />
          <Row label={t(bookingEmails.guest.labels.date, locale)} value={summary.date} />
          <Row
            label={t(bookingEmails.guest.labels.departure, locale)}
            value={summary.departure}
          />
          <Row
            label={t(bookingEmails.guest.labels.party, locale)}
            value={summary.partyLabel}
          />
          <Row label={t(bookingContent.labels.total, locale)} value={summary.total} />
        </dl>

        <p className="mt-4 text-sm text-muted-foreground">
          {fill(t(c.deadlineNote, locale), { deadline: summary.deadline })}
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          {fill(t(c.refundNote, locale), { amount: summary.refund })}
        </p>

        {state.status === "error" ? (
          <p role="alert" className="mt-4 text-sm font-medium text-destructive">
            {t(c.errors[state.error], locale)}
          </p>
        ) : null}

        {confirming ? (
          <div className="mt-6 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
            <h2 className="font-heading text-lg font-semibold">
              {t(c.confirmTitle, locale)}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {t(c.confirmBody, locale)}
            </p>
            <form action={formAction} className="mt-4 flex flex-wrap gap-3">
              <input type="hidden" name="token" value={token} />
              <input type="hidden" name="locale" value={locale} />
              {/*
                * "Manter" first in the DOM as well as in the design: it is the
                * default action, so it is what a keyboard reaches first and what
                * a screen reader reads first.
                */}
              <Button type="button" size="lg" onClick={() => setConfirming(false)}>
                {t(c.keep, locale)}
              </Button>
              <ConfirmButton locale={locale} />
            </form>
          </div>
        ) : (
          <div className="mt-6">
            <Button
              type="button"
              size="lg"
              variant="outline"
              onClick={() => setConfirming(true)}
            >
              {t(c.start, locale)}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ConfirmButton({ locale }: { locale: Locale }) {
  const { pending } = useFormStatus();
  const c = bookingContent.cancellation;
  return (
    <Button type="submit" size="lg" variant="destructive" disabled={pending}>
      {pending ? t(c.cancelling, locale) : t(c.confirm, locale)}
    </Button>
  );
}

/**
 * The one answer every dead link gets: unknown, spent, revoked, or pointing at
 * a booking that is already over.
 *
 * Exported because the page renders it without ever reaching the interactive
 * panel — there is nothing to confirm when there is no booking.
 */
export function UnknownPanel({ locale }: { locale: Locale }) {
  const c = bookingContent.cancellation;
  return (
    <Panel
      tone="wait"
      icon={<HelpCircle className="size-5" />}
      title={t(c.unknownTitle, locale)}
      lead={t(c.unknownBody, locale)}
    >
      <Contacts locale={locale} />
      <HomeLinks locale={locale} />
    </Panel>
  );
}

/**
 * A throttled lookup, not a dead link — same shared-IP reasoning as the quote
 * page (`app/[locale]/orcamento/[token]/page.tsx`). Says nothing about
 * whether the token was real, same as {@link UnknownPanel}, but tells a
 * genuine guest to wait rather than that their booking is gone.
 */
export function ThrottledPanel({ locale }: { locale: Locale }) {
  const c = bookingContent.cancellation;
  return (
    <Panel
      tone="wait"
      icon={<Clock className="size-5" />}
      title={t(c.throttledTitle, locale)}
      lead={t(c.throttledBody, locale)}
    >
      <HomeLinks locale={locale} />
    </Panel>
  );
}

/**
 * Inside 48 hours: the promise's own wording, and the two people who can still
 * do something about it.
 *
 * Phones and WhatsApp rather than a form, because what happens next is a
 * conversation — the team cancels for weather and for goodwill regardless of
 * the clock, and no rule on this page could stand in for that.
 */
export function TooLatePanel({
  locale,
  deadline,
}: {
  locale: Locale;
  deadline: string;
}) {
  const c = bookingContent.cancellation;
  return (
    <Panel
      tone="wait"
      icon={<AlertTriangle className="size-5" />}
      title={t(c.tooLateTitle, locale)}
      lead={fill(t(c.tooLateBody, locale), { deadline })}
    >
      <Contacts locale={locale} />
      <HomeLinks locale={locale} />
    </Panel>
  );
}

/** Diogo & Rita, tappable: dial on a phone, WhatsApp where the number allows. */
function Contacts({ locale }: { locale: Locale }) {
  const c = bookingContent.cancellation;
  return (
    <div className="mt-6 border-t pt-4">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {t(c.contactHeading, locale)}
      </h2>
      <ul className="mt-3 space-y-2">
        {site.contacts.map((contact) => {
          const whatsApp = toWhatsAppHref(contact.phone);
          return (
            <li key={contact.phone} className="flex flex-wrap items-center gap-3 text-sm">
              <span className="font-medium">{contact.name}</span>
              <a
                href={`tel:${contact.phone}`}
                className="inline-flex items-center gap-1.5 underline hover:text-primary"
              >
                <Phone className="size-4" aria-hidden />
                {contact.phoneDisplay}
              </a>
              {whatsApp ? (
                <a
                  href={whatsApp}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 underline hover:text-primary"
                >
                  <MessageCircle className="size-4" aria-hidden />
                  {t(c.whatsApp, locale)}
                </a>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** The same two ways out the confirmation page offers. */
function HomeLinks({ locale }: { locale: Locale }) {
  const c = bookingContent.confirmation;
  return (
    <div className="mt-8 flex flex-wrap gap-3">
      <Button asChild size="lg">
        <Link href={href(locale, "home")}>{t(c.backHome, locale)}</Link>
      </Button>
      <Button asChild size="lg" variant="outline">
        <Link href={href(locale, "contactos")}>{t(c.contactUs, locale)}</Link>
      </Button>
    </div>
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

/** Shape-for-shape the substitution the emails use — `{key}` and nothing else. */
function fill(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? values[key] : match,
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
