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

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="preferredDate">{t(c.labels.preferredDate, locale)}</Label>
          <Input
            id="preferredDate"
            name="preferredDate"
            placeholder={t(c.placeholders.preferredDate, locale)}
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
        <Label htmlFor="message">{t(c.labels.message, locale)}</Label>
        <Textarea
          id="message"
          name="message"
          rows={4}
          placeholder={t(c.placeholders.message, locale)}
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
