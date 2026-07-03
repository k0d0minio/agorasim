"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { CheckCircle2 } from "lucide-react";
import { t, type Locale } from "@/i18n/config";
import { tourRequestContent } from "@/content/tour-request";
import { complementExperiences, experiences } from "@/content/experiences";
import { submitTourRequest, type TourRequestState } from "@/app/[locale]/reservar/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const inputClass =
  "h-9 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

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
export function TourRequestForm({ locale }: { locale: Locale }) {
  const [state, formAction] = useActionState<TourRequestState, FormData>(submitTourRequest, {});
  const c = tourRequestContent;

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

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="name" className="text-sm font-medium">
            {t(c.labels.name, locale)}
          </label>
          <input id="name" name="name" required autoComplete="name" className={inputClass} />
          {state.fieldErrors?.name ? (
            <p className="text-sm text-destructive" role="alert">
              {state.fieldErrors.name}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className="text-sm font-medium">
            {t(c.labels.email, locale)}
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            className={inputClass}
          />
          {state.fieldErrors?.email ? (
            <p className="text-sm text-destructive" role="alert">
              {state.fieldErrors.email}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="phone" className="text-sm font-medium">
            {t(c.labels.phone, locale)}
          </label>
          <input id="phone" name="phone" type="tel" autoComplete="tel" className={inputClass} />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="partySize" className="text-sm font-medium">
            {t(c.labels.partySize, locale)}
          </label>
          <input
            id="partySize"
            name="partySize"
            type="number"
            min={1}
            inputMode="numeric"
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="experience" className="text-sm font-medium">
            {t(c.labels.experience, locale)}
          </label>
          <select id="experience" name="experience" defaultValue="" className={inputClass}>
            <option value="">{t(c.placeholders.experienceNone, locale)}</option>
            {experiences.map((exp) => (
              <option key={exp.slug} value={exp.slug}>
                {t(exp.title, locale)}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="preferredDate" className="text-sm font-medium">
            {t(c.labels.preferredDate, locale)}
          </label>
          <input
            id="preferredDate"
            name="preferredDate"
            placeholder={t(c.placeholders.preferredDate, locale)}
            className={inputClass}
          />
        </div>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium">{t(c.labels.addOns, locale)}</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {complementExperiences.map((exp) => (
            <label
              key={exp.slug}
              className="flex items-center gap-2.5 rounded-lg border border-border px-3 py-2 text-sm"
            >
              <input
                type="checkbox"
                name="addOns"
                value={exp.slug}
                className="size-4 rounded border-border accent-primary"
              />
              {t(exp.title, locale)}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="message" className="text-sm font-medium">
          {t(c.labels.message, locale)}
        </label>
        <textarea
          id="message"
          name="message"
          rows={4}
          placeholder={t(c.placeholders.message, locale)}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
      </div>

      {state.error ? (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}

      <div>
        <SubmitButton locale={locale} />
      </div>
    </form>
  );
}
