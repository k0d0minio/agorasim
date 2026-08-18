"use client";

import { useActionState } from "react";
import Link from "next/link";
import { useFormStatus } from "react-dom";
import { CheckCircle2 } from "lucide-react";

import { t, type Locale } from "@/i18n/config";
import { weddingsContent } from "@/content/weddings";
import { privacyContent } from "@/content/privacy";
import { fleet } from "@/content/site";
import { href } from "@/lib/routes";
import { HONEYPOT_FIELD } from "@/lib/honeypot";
import {
  submitWeddingQuote,
  type WeddingQuoteState,
} from "@/app/[locale]/casamentos/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

/**
 * The wedding quote form, live (AGORA-005). It replaces the disabled design
 * preview: same fields, but they post — into `tour_requests` as a `wedding`
 * lead the Sales board shows. The quote itself stays a human reply within
 * 24–48h, which is what the copy promises.
 */

function SubmitButton({ locale }: { locale: Locale }) {
  const { pending } = useFormStatus();
  const c = weddingsContent.quote.labels;
  return (
    <Button type="submit" size="lg" disabled={pending}>
      {pending ? t(c.sending, locale) : t(c.submit, locale)}
    </Button>
  );
}

export function WeddingQuoteForm({ locale }: { locale: Locale }) {
  const c = weddingsContent.quote;
  const l = locale;

  const [state, formAction] = useActionState<WeddingQuoteState, FormData>(
    submitWeddingQuote,
    {},
  );

  if (state.ok) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
          <CheckCircle2 className="size-8 text-primary" />
          <p className="font-heading text-xl font-semibold">{t(c.success.title, l)}</p>
          <p className="max-w-prose text-sm text-muted-foreground">
            {t(c.success.body, l)}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <form action={formAction} className="mt-8 flex flex-col gap-5">
      <input type="hidden" name="locale" value={locale} />

      {/* Honeypot — same rig as the other public forms. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-[9999px] h-0 w-0 overflow-hidden"
      >
        <label htmlFor={`wd-${HONEYPOT_FIELD}`}>Company website</label>
        <input
          id={`wd-${HONEYPOT_FIELD}`}
          name={HONEYPOT_FIELD}
          type="text"
          tabIndex={-1}
          autoComplete="off"
          defaultValue=""
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="wd-names">{t(c.labels.names, l)}</Label>
          <Input id="wd-names" name="names" required autoComplete="name" />
          {state.fieldErrors?.names ? (
            <p className="text-sm text-destructive" role="alert">
              {state.fieldErrors.names}
            </p>
          ) : null}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="wd-email">{t(c.labels.email, l)}</Label>
          <Input id="wd-email" name="email" type="email" required autoComplete="email" />
          {state.fieldErrors?.email ? (
            <p className="text-sm text-destructive" role="alert">
              {state.fieldErrors.email}
            </p>
          ) : null}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="wd-phone">{t(c.labels.phone, l)}</Label>
          <Input id="wd-phone" name="phone" type="tel" autoComplete="tel" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="wd-date">{t(c.labels.date, l)}</Label>
          <Input id="wd-date" name="date" type="date" />
        </div>
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label htmlFor="wd-venue">{t(c.labels.venue, l)}</Label>
          <Input
            id="wd-venue"
            name="venue"
            placeholder={t(c.labels.venuePlaceholder, l)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="wd-hours">{t(c.labels.hours, l)}</Label>
          <Select id="wd-hours" name="hours">
            {t(c.labels.hoursOptions, l).map((opt) => (
              <option key={opt}>{opt}</option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="wd-car">{t(c.labels.car, l)}</Label>
          <Select id="wd-car" name="car">
            <option>{t(c.labels.carNone, l)}</option>
            {fleet.map((car) => (
              <option key={car.model}>{`${car.name} — ${car.model} (${car.year})`}</option>
            ))}
          </Select>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="wd-message">{t(c.labels.message, l)}</Label>
        <Textarea
          id="wd-message"
          name="message"
          rows={4}
          placeholder={t(c.labels.messagePlaceholder, l)}
        />
      </div>

      {/* Marketing opt-in: separate, unticked, never a condition of sending. */}
      <div className="rounded-xl border border-border bg-secondary/20 px-4 py-3">
        <label className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            name="marketingConsent"
            value="on"
            className="mt-0.5 size-4 shrink-0 rounded border-border accent-primary"
          />
          <span>
            {t(privacyContent.marketing.label, l)}
            <span className="mt-1 block text-xs text-muted-foreground">
              {t(privacyContent.marketing.hint, l)}
            </span>
          </span>
        </label>
      </div>

      <p className="max-w-prose text-xs leading-relaxed text-muted-foreground">
        {t(privacyContent.formNotice.intro, l)}{" "}
        {t(privacyContent.formNotice.linkPrefix, l)}{" "}
        <Link href={href(l, "privacidade")} className="underline hover:text-primary">
          {t(privacyContent.formNotice.linkLabel, l)}
        </Link>
        .
      </p>

      <div>
        <SubmitButton locale={l} />
        {state.error ? (
          <p className="mt-2 text-sm text-destructive" role="alert">
            {state.error}
          </p>
        ) : null}
      </div>
    </form>
  );
}
