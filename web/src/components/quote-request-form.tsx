"use client";

import { useActionState } from "react";
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
import { HONEYPOT_FIELD } from "@/lib/honeypot";
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
 * badge on the card. Weddings and events ask for exactly the same things —
 * where, when, how long, which car, how many of you — so a second copy of this
 * form would only have been a second place to fix a bug.
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
  /** Today in Portugal, `YYYY-MM-DD` — the floor on the date picker. */
  today: string;
}) {
  const [state, formAction] = useActionState<QuoteRequestState, FormData>(
    submitQuoteRequest,
    {},
  );
  const shared = quoteRequestShared;
  const optional = t(shared.labels.optional, locale);

  if (state.ok) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
          <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <CheckCircle2 className="size-5" />
          </div>
          <div className="max-w-sm space-y-1">
            <p className="font-heading text-lg font-medium">{t(shared.success.title, locale)}</p>
            <p className="text-sm text-muted-foreground">{t(shared.success.body, locale)}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <form action={formAction} className="mt-8 flex flex-col gap-5" noValidate>
      <input type="hidden" name="locale" value={locale} />
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
        <label htmlFor={`${kind}-${HONEYPOT_FIELD}`}>Company website</label>
        <input
          id={`${kind}-${HONEYPOT_FIELD}`}
          name={HONEYPOT_FIELD}
          type="text"
          tabIndex={-1}
          autoComplete="off"
          defaultValue=""
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="name">{t(copy.labels.names, locale)}</Label>
          <Input id="name" name="name" required autoComplete="name" />
          {state.fieldErrors?.name ? (
            <p className="text-sm text-destructive" role="alert">
              {state.fieldErrors.name}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">{t(copy.labels.email, locale)}</Label>
          <Input id="email" name="email" type="email" required autoComplete="email" />
          {state.fieldErrors?.email ? (
            <p className="text-sm text-destructive" role="alert">
              {state.fieldErrors.email}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="phone">
            {t(copy.labels.phone, locale)} {optional}
          </Label>
          <Input id="phone" name="phone" type="tel" autoComplete="tel" />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="preferredDate">{t(copy.labels.date, locale)}</Label>
          {/*
            The column behind this is `preferred_date`, the same free-text one
            the tour enquiry writes — so the Sales board already leads the card
            with it and nothing downstream had to learn a second date.
          */}
          <Input id="preferredDate" name="preferredDate" type="date" min={today} />
        </div>

        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label htmlFor="venue">{t(copy.labels.venue, locale)}</Label>
          <Input
            id="venue"
            name="venue"
            placeholder={t(copy.labels.venuePlaceholder, locale)}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="serviceHours">{t(copy.labels.hours, locale)}</Label>
          <Select id="serviceHours" name="serviceHours" defaultValue="">
            <option value="">—</option>
            {SERVICE_HOURS.map((option) => (
              <option key={option.value} value={option.value}>
                {t(option.label, locale)}
              </option>
            ))}
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="preferredCar">{t(copy.labels.car, locale)}</Label>
          <Select id="preferredCar" name="preferredCar" defaultValue="">
            <option value="">{t(copy.labels.carNone, locale)}</option>
            {classicCars.map((car) => (
              <option key={car.id} value={car.id}>
                {`${car.name} — ${car.model} (${car.year})`}
              </option>
            ))}
          </Select>
        </div>

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
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="message">{t(copy.labels.message, locale)}</Label>
        <Textarea
          id="message"
          name="message"
          rows={4}
          placeholder={t(copy.labels.messagePlaceholder, locale)}
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
