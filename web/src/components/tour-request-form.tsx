"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { t, type Locale } from "@/i18n/config";
import { tourRequestContent } from "@/content/tour-request";
import { privacyContent } from "@/content/privacy";
import type { Experience } from "@/content/experiences";
import type { PublicMonth } from "@/lib/availability";
import { BookingDatePicker } from "@/components/booking-date-picker";
import { HONEYPOT_FIELD } from "@/lib/honeypot";
import { href } from "@/lib/routes";
import { submitTourRequest, type TourRequestState } from "@/app/[locale]/reservar/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

function SubmitButton({ locale }: { locale: Locale }) {
  const { pending } = useFormStatus();
  const c = tourRequestContent;
  return (
    <Button type="submit" size="lg" disabled={pending}>
      {pending ? t(c.labels.submitting, locale) : t(c.labels.submit, locale)}
    </Button>
  );
}

/** Public onboarding form for customers requesting a tour. */
export function TourRequestForm({
  locale,
  experiences,
  availability = [],
}: {
  locale: Locale;
  /** The live catalogue, passed in by the page that renders this form. */
  experiences: Experience[];
  /**
   * The open days, month by month, passed in by the page. Empty when the
   * calendar has nothing to offer or could not be read — in which case the date
   * field stays what it always was, a text box asking when they'd like to come.
   * A booking page that stops taking leads because a table is empty is worse
   * than one with no calendar.
   */
  availability?: PublicMonth[];
}) {
  const [state, formAction] = useActionState<TourRequestState, FormData>(submitTourRequest, {});
  const c = tourRequestContent;
  const complementExperiences = experiences.filter((e) => e.kind === "complement");
  const hasCalendar = availability.some((month) => month.hasOpenings);

  if (state.ok) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
          <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <CheckCircle2 className="size-5" />
          </div>
          <div className="max-w-sm space-y-1">
            <p className="font-heading text-lg font-medium">{t(c.success.title, locale)}</p>
            <p className="text-sm text-muted-foreground">{t(c.success.body, locale)}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
      <input type="hidden" name="locale" value={locale} />

      {/*
        Honeypot. Positioned off-screen rather than `display: none` so naive bots
        still fill it in; hidden from assistive tech and skipped by tab order, so
        no real person can reach it. Anything submitted here is discarded server
        side. `type="hidden"` would not work — bots skip hidden inputs.
      */}
      <div aria-hidden="true" className="pointer-events-none absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label htmlFor={HONEYPOT_FIELD}>Company website</label>
        <input
          id={HONEYPOT_FIELD}
          name={HONEYPOT_FIELD}
          type="text"
          tabIndex={-1}
          autoComplete="off"
          defaultValue=""
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="name">{t(c.labels.name, locale)}</Label>
          <Input id="name" name="name" required autoComplete="name" />
          {state.fieldErrors?.name ? (
            <p className="text-sm text-destructive" role="alert">
              {state.fieldErrors.name}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">{t(c.labels.email, locale)}</Label>
          <Input id="email" name="email" type="email" required autoComplete="email" />
          {state.fieldErrors?.email ? (
            <p className="text-sm text-destructive" role="alert">
              {state.fieldErrors.email}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="phone">{t(c.labels.phone, locale)}</Label>
          <Input id="phone" name="phone" type="tel" autoComplete="tel" />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="partySize">{t(c.labels.partySize, locale)}</Label>
          <Input id="partySize" name="partySize" type="number" min={1} inputMode="numeric" />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="experience">{t(c.labels.experience, locale)}</Label>
          <Select id="experience" name="experience" defaultValue="">
            <option value="">{t(c.placeholders.experienceNone, locale)}</option>
            {experiences.map((exp) => (
              <option key={exp.slug} value={exp.slug}>
                {t(exp.title, locale)}
              </option>
            ))}
          </Select>
        </div>

        {/*
          The date field is a text box only when there is no live calendar to
          offer. When there is, the picker owns the `preferredDate` name and
          posts either a `YYYY-MM-DD` key or the guest's own words — so nothing
          downstream (the column, the Sales board, the lead page) had to change.
        */}
        {hasCalendar ? null : (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="preferredDate">{t(c.labels.preferredDate, locale)}</Label>
            <Input
              id="preferredDate"
              name="preferredDate"
              placeholder={t(c.placeholders.preferredDate, locale)}
            />
          </div>
        )}
      </div>

      {hasCalendar ? (
        <BookingDatePicker
          locale={locale}
          name="preferredDate"
          months={availability}
          defaultValue={state.values?.preferredDate}
          error={state.fieldErrors?.preferredDate}
        />
      ) : null}

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium">{t(c.labels.addOns, locale)}</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {complementExperiences.map((exp) => (
            // The whole row is the target — a 16px checkbox is the glyph, not
            // the hit area — so the row carries the 44px minimum (spec §2 T1/T4).
            <label
              key={exp.slug}
              className="flex min-h-11 touch-manipulation items-center gap-2.5 rounded-lg border border-border px-3 py-2 text-sm"
            >
              <input
                type="checkbox"
                name="addOns"
                value={exp.slug}
                className="size-4 shrink-0 rounded border-border accent-primary"
              />
              {t(exp.title, locale)}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="message">{t(c.labels.message, locale)}</Label>
        <Textarea
          id="message"
          name="message"
          rows={4}
          placeholder={t(c.placeholders.message, locale)}
        />
      </div>

      {/*
        Marketing opt-in. Separate from the enquiry, never pre-ticked, and never
        a condition of submitting — three requirements of valid consent
        (GDPR Art. 4(11) and 7(4)) that are trivially easy to break by making
        this a `required` field or defaulting it to checked. Don't.

        The wording is versioned: `MARKETING_CONSENT_VERSION` is submitted with
        the form and stored on the row, so what someone agreed to stays provable
        after the copy changes.
      */}
      <div className="rounded-xl border border-border bg-secondary/20 px-4 py-3">
        <label className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            name="marketingConsent"
            value="on"
            className="mt-0.5 size-4 shrink-0 rounded border-border accent-primary"
          />
          <span>
            {t(privacyContent.marketing.label, locale)}
            <span className="mt-1 block text-xs text-muted-foreground">
              {t(privacyContent.marketing.hint, locale)}
            </span>
          </span>
        </label>
      </div>

      {state.error ? (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}

      <div className="flex flex-col gap-4">
        {/*
          Notice at the point of collection (Art. 13): what we take, why, for how
          long, and where the full policy is — next to the button that sends it,
          not buried in a footer link.
        */}
        <p className="max-w-prose text-xs leading-relaxed text-muted-foreground">
          {t(privacyContent.formNotice.intro, locale)}{" "}
          {t(privacyContent.formNotice.linkPrefix, locale)}{" "}
          <Link href={href(locale, "privacidade")} className="underline hover:text-primary">
            {t(privacyContent.formNotice.linkLabel, locale)}
          </Link>
          .
        </p>

        <div>
          <SubmitButton locale={locale} />
        </div>
      </div>
    </form>
  );
}
