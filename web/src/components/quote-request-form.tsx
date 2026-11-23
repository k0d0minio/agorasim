"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { t, type Locale } from "@/i18n/config";
import { classicCars } from "@/content/site";
import { privacyContent } from "@/content/privacy";
import {
  quoteRequestShared,
  SERVICE_HOURS,
  type QuoteFormCopy,
} from "@/content/quote-request";
import { maskDayFirst, parseDayFirst } from "@/lib/date-keys";
import { BookingSourceFields } from "@/components/booking-source";
import { HONEYPOT_FIELD, HONEYPOT_INPUT_PROPS, HONEYPOT_LABEL } from "@/lib/honeypot";
import { href } from "@/lib/routes";
import { submitQuoteRequest, type QuoteRequestState } from "@/app/[locale]/quote-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

function SubmitButton({ locale, label }: { locale: Locale; label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" disabled={pending}>
      {pending ? t(quoteRequestShared.labels.submitting, locale) : label}
    </Button>
  );
}

/**
 * The quote form behind `/casamentos` and `/eventos`.
 *
 * One component, two voices: the labels come from whichever page rendered it
 * (`copy`), the sentences the form says about itself come from
 * `content/quote-request.ts`, and `kind` is what the Sales board reads as the
 * badge on the card. Weddings and events ask for the same things — where,
 * when, how long, which car — so a second copy of this form would only have
 * been a second place to fix a bug. The one difference is the head count: an
 * event asks it, a wedding does not, and the page says which by giving
 * `copy.labels.partySize` or leaving it out.
 *
 * Everything below the e-mail is optional, deliberately. A couple who have not
 * settled on a venue and a company that has not fixed its date are both leads
 * worth having, and a required field is how a lead becomes a closed tab. The
 * fields are asked for because the quote is written from them by hand, not
 * because the form refuses to work without them.
 */
export function QuoteRequestForm({
  locale,
  kind,
  copy,
  today,
}: {
  locale: Locale;
  kind: "wedding" | "event";
  copy: QuoteFormCopy;
  /** Today in Portugal, `YYYY-MM-DD` — the floor on the date field. */
  today: string;
}) {
  const [state, formAction] = useActionState<QuoteRequestState, FormData>(
    submitQuoteRequest,
    {},
  );
  const shared = quoteRequestShared;
  // The form (and the focused submit button) unmounts on success; without a
  // focus move a keyboard / screen-reader user lands on <body> (WCAG 2.4.3).
  const successRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (state.ok) successRef.current?.focus();
  }, [state.ok]);
  const optional = t(shared.labels.optional, locale);
  /*
   * What the guest typed, when the server refused the enquiry. React resets
   * the form after the action, to each field's default. These values are the
   * defaults, so the fields keep what the guest typed (JAM-487). A select
   * reads its default only when it mounts, so each select has its value as
   * its key: a new value mounts the select again with that default.
   */
  const typed = state.values;

  /*
   * The date field is text that this page controls, not a native date field.
   * A browser draws a native one in the browser's own language, so a browser
   * in US English showed month first on the Portuguese page (JAM-320). Here
   * the order is day, month, year on both pages, and the server stores the
   * same `YYYY-MM-DD` as before (`quoteRequestSchema`).
   */
  // Without JavaScript the page renders again from the refusal, so the date
  // starts from what the guest typed.
  const [dateText, setDateText] = useState(typed?.preferredDate ?? "");
  const [dateError, setDateError] = useState<"dateFormat" | "datePast" | null>(null);
  const dateRef = useRef<HTMLInputElement>(null);
  /** Empty is good: the date is optional. A past date is refused, as before. */
  function dateFault(value: string): "dateFormat" | "datePast" | null {
    if (!value.trim()) return null;
    const key = parseDayFirst(value);
    if (!key) return "dateFormat";
    return key < today ? "datePast" : null;
  }
  function refuseBadDate(event: { preventDefault(): void }) {
    const fault = dateFault(dateText);
    if (!fault) return;
    // Stop the send, so the person corrects the date with the rest of the
    // form still filled in.
    event.preventDefault();
    setDateError(fault);
    dateRef.current?.focus();
  }

  if (state.ok) {
    return (
      // role="status" announces the outcome (WCAG 4.1.3); the focus move above is
      // the reliable path, since a region mounted with its text is often skipped.
      <Card role="status">
        <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
          <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <CheckCircle2 className="size-5" />
          </div>
          <div className="max-w-sm space-y-1">
            <p
              ref={successRef}
              tabIndex={-1}
              className="font-heading text-lg font-medium outline-none"
            >
              {t(shared.success.title, locale)}
            </p>
            <p className="text-sm text-muted-foreground">{t(shared.success.body, locale)}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <form
      action={formAction}
      onSubmit={refuseBadDate}
      className="mt-8 flex flex-col gap-5"
      noValidate
    >
      <input type="hidden" name="locale" value={locale} />
      <BookingSourceFields />
      {/* Which door this is. See `quoteRequestSchema` for why it is only
          half-trusted — a forged value costs a badge, not a lead. */}
      <input type="hidden" name="kind" value={kind} />

      {/*
        Honeypot — same off-screen field, same reasoning, as the tour enquiry
        form: naive bots fill it, nobody else can reach it, and the action
        discards anything that arrives in it. See `components/tour-request-form`.
      */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-[9999px] h-0 w-0 overflow-hidden"
      >
        <label htmlFor={`${kind}-${HONEYPOT_FIELD}`}>{HONEYPOT_LABEL}</label>
        <input
          id={`${kind}-${HONEYPOT_FIELD}`}
          name={HONEYPOT_FIELD}
          {...HONEYPOT_INPUT_PROPS}
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="name">{t(copy.labels.names, locale)}</Label>
          <Input
            id="name"
            name="name"
            required
            autoComplete="name"
            defaultValue={typed?.name}
            aria-invalid={Boolean(state.fieldErrors?.name)}
            aria-describedby={state.fieldErrors?.name ? "name-error" : undefined}
          />
          {state.fieldErrors?.name ? (
            <p id="name-error" className="text-sm text-destructive" role="alert">
              {state.fieldErrors.name}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">{t(copy.labels.email, locale)}</Label>
          <Input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            defaultValue={typed?.email}
            aria-invalid={Boolean(state.fieldErrors?.email)}
            aria-describedby={state.fieldErrors?.email ? "email-error" : undefined}
          />
          {state.fieldErrors?.email ? (
            <p id="email-error" className="text-sm text-destructive" role="alert">
              {state.fieldErrors.email}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="phone">
            {t(copy.labels.phone, locale)} {optional}
          </Label>
          <Input
            id="phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            defaultValue={typed?.phone}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="preferredDate">
            {t(copy.labels.date, locale)} {optional}
          </Label>
          {/*
            The column behind this is `preferred_date`, the same free-text one
            the tour enquiry writes — so the Sales board already leads the card
            with it and nothing downstream had to learn a second date.
          */}
          <Input
            ref={dateRef}
            id="preferredDate"
            name="preferredDate"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            maxLength={10}
            placeholder={t(shared.placeholders.date, locale)}
            value={dateText}
            onChange={(event) => {
              setDateText(maskDayFirst(event.target.value, dateText));
              setDateError(null);
            }}
            onBlur={() => setDateError(dateFault(dateText))}
            aria-invalid={Boolean(dateError)}
            aria-describedby={dateError ? "preferredDate-error" : "preferredDate-hint"}
          />
          <p id="preferredDate-hint" className="sr-only">
            {t(shared.hints.date, locale)}
          </p>
          {dateError ? (
            <p id="preferredDate-error" className="text-sm text-destructive" role="alert">
              {t(shared.errors[dateError], locale)}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label htmlFor="venue">
            {t(copy.labels.venue, locale)} {optional}
          </Label>
          <Input
            id="venue"
            name="venue"
            placeholder={t(copy.labels.venuePlaceholder, locale)}
            defaultValue={typed?.venue}
          />
        </div>

        {/*
          A page asks one of the two. `/casamentos` asks when the ceremony
          starts, because a wedding is priced per event. `/eventos` asks how
          long the cars are wanted for.
        */}
        {copy.labels.ceremonyTime ? (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ceremonyTime">
              {t(copy.labels.ceremonyTime, locale)} {optional}
            </Label>
            <Input
              id="ceremonyTime"
              name="ceremonyTime"
              type="time"
              defaultValue={typed?.ceremonyTime}
            />
          </div>
        ) : null}

        {copy.labels.hours ? (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="serviceHours">
              {t(copy.labels.hours, locale)} {optional}
            </Label>
            <Select
              key={typed?.serviceHours ?? ""}
              id="serviceHours"
              name="serviceHours"
              defaultValue={typed?.serviceHours ?? ""}
            >
              <option value="">—</option>
              {SERVICE_HOURS.map((option) => (
                <option key={option.value} value={option.value}>
                  {t(option.label, locale)}
                </option>
              ))}
            </Select>
          </div>
        ) : null}

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="preferredCar">
            {t(copy.labels.car, locale)} {optional}
          </Label>
          <Select
            key={typed?.preferredCar ?? ""}
            id="preferredCar"
            name="preferredCar"
            defaultValue={typed?.preferredCar ?? ""}
          >
            <option value="">{t(copy.labels.carNone, locale)}</option>
            {classicCars.map((car) => (
              <option key={car.id} value={car.id}>
                {`${car.name} — ${car.model} (${car.year})`}
              </option>
            ))}
          </Select>
        </div>

        {copy.labels.partySize ? (
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="partySize">
              {t(copy.labels.partySize, locale)} {optional}
            </Label>
            <Input
              id="partySize"
              name="partySize"
              type="number"
              min={1}
              inputMode="numeric"
              placeholder={t(shared.placeholders.partySize, locale)}
              defaultValue={typed?.partySize}
            />
          </div>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="message">
          {t(copy.labels.message, locale)} {optional}
        </Label>
        <Textarea
          id="message"
          name="message"
          rows={4}
          placeholder={t(copy.labels.messagePlaceholder, locale)}
          defaultValue={typed?.message}
        />
      </div>

      {/*
        Marketing opt-in — never pre-ticked, never required, versioned on the
        row. The same three rules as the tour enquiry, for the same reasons
        (GDPR Art. 4(11) and 7(4)); see `components/tour-request-form`.
      */}
      <div className="rounded-xl border border-border bg-secondary/20 px-4 py-3">
        <label className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            name="marketingConsent"
            value="on"
            defaultChecked={typed?.marketingConsent}
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
        {/* Notice at the point of collection (Art. 13), next to the button. */}
        <p className="max-w-prose text-xs leading-relaxed text-muted-foreground">
          {t(privacyContent.formNotice.quoteIntro, locale)}{" "}
          {t(privacyContent.formNotice.linkPrefix, locale)}{" "}
          <Link href={href(locale, "privacidade")} className="underline hover:text-primary">
            {t(privacyContent.formNotice.linkLabel, locale)}
          </Link>
          .
        </p>

        <div>
          <SubmitButton locale={locale} label={t(copy.labels.submit, locale)} />
        </div>
      </div>
    </form>
  );
}
