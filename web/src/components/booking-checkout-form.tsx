"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { useFormStatus } from "react-dom";
import { Check, Lock, Minus, Plus, ShieldCheck } from "lucide-react";

import { t, type Locale } from "@/i18n/config";
import { bookingContent } from "@/content/booking";
import { privacyContent } from "@/content/privacy";
import type { Experience } from "@/content/experiences";
import type { PublicMonth } from "@/lib/availability";
import { formatPrice } from "@/lib/money";
import { href } from "@/lib/routes";
import { HONEYPOT_FIELD } from "@/lib/honeypot";
import {
  startCheckout,
  type CheckoutState,
} from "@/app/[locale]/reservar/checkout-actions";
import { BookingDatePicker } from "@/components/booking-date-picker";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

/**
 * The real booking flow: pick a day, pick a group, pay.
 *
 * It replaces `BookingFlow`, the interactive design preview that shipped with
 * invented prices, an invented August 2026 calendar and a locked pay button.
 * The shape of the preview survives — steps down the page, a summary card that
 * sticks on desktop — because that is the flow Diogo & Rita signed off on; what
 * changed is that every number in it is real.
 *
 * **The prices here are for reading, not for charging.** The catalogue entries
 * arrive as props so the guest can watch a total move as they add a person or a
 * tasting; the server prices the basket again from the same rows before it
 * creates a Stripe session. Nothing this component computes is ever trusted —
 * see `startCheckout`, which does not so much as look at a total in the form.
 *
 * The deposit/full choice from the preview is gone: the launch decision is full
 * payment at booking, and an option nobody can pick is a question that wastes a
 * tap.
 */

function PayButton({ locale }: { locale: Locale }) {
  const { pending } = useFormStatus();
  const c = bookingContent.labels;
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      <Lock className="size-4" />
      {pending ? t(c.paying, locale) : t(c.pay, locale)}
    </Button>
  );
}

export function BookingCheckoutForm({
  locale,
  experiences,
  availability,
  testMode,
}: {
  locale: Locale;
  /** The live catalogue. Only priced entries reach this component. */
  experiences: Experience[];
  availability: PublicMonth[];
  /** Running against Stripe test keys — say so, loudly. */
  testMode: boolean;
}) {
  const c = bookingContent;
  const l = locale;

  const [state, formAction] = useActionState<CheckoutState, FormData>(startCheckout, {});
  /*
   * Money is formatted here rather than server-side because the total moves as
   * the guest adds a person or a tasting. `lib/money.ts` exists precisely so
   * both sides can share these rules — see the note at the top of that file.
   */
  const price = (cents: number) => formatPrice(cents, l);

  // Whatever stopped the submission, in one place — the field errors render
  // next to their fields too, but those are off-screen from the pay button.
  const problem =
    state.error ??
    state.fieldErrors?.date ??
    state.fieldErrors?.partySize ??
    state.fieldErrors?.name ??
    state.fieldErrors?.email;

  const signature = experiences.find((entry) => entry.kind === "signature")!;
  const complements = experiences.filter((entry) => entry.kind === "complement");

  const [party, setParty] = useState(2);
  const [addOns, setAddOns] = useState<Set<string>>(new Set());

  const chosenAddOns = complements.filter((entry) => addOns.has(entry.slug));
  const perPerson =
    (signature.priceCents ?? 0) +
    chosenAddOns.reduce((sum, entry) => sum + (entry.priceCents ?? 0), 0);
  const total = perPerson * party;

  function toggleAddOn(slug: string) {
    setAddOns((previous) => {
      const next = new Set(previous);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  }

  return (
    <form action={formAction} className="grid gap-8 lg:grid-cols-[1fr_360px] lg:items-start">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="experience" value={signature.slug} />
      <input type="hidden" name="partySize" value={party} />
      {[...addOns].map((slug) => (
        <input key={slug} type="hidden" name="addOns" value={slug} />
      ))}

      {/* Honeypot — same rig as the enquiry form: off-screen rather than
          hidden, so naive bots fill it in and real people never reach it. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-[9999px] h-0 w-0 overflow-hidden"
      >
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

      <div className="flex flex-col gap-10">
        <BookingDatePicker
          locale={l}
          // The checkout's field, not the enquiry's. A card cannot be charged
          // for "late August", so the free-text escape becomes a link out.
          name="date"
          allowFlexible={false}
          contactHref={href(l, "contactos")}
          months={availability}
          defaultValue={state.values?.date}
          error={state.fieldErrors?.date}
        />

        <section aria-labelledby="bk-party">
          <h2 id="bk-party" className="text-xl font-semibold sm:text-2xl">
            {t(c.labels.partySize, l)}
          </h2>
          <Card className="mt-4 p-4">
            <div className="flex items-center justify-center gap-6 py-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setParty((n) => Math.max(1, n - 1))}
                aria-label={t(c.labels.fewer, l)}
                disabled={party <= 1}
              >
                <Minus className="size-4" />
              </Button>
              <output
                aria-live="polite"
                className="min-w-10 text-center font-heading text-3xl font-semibold"
              >
                {party}
              </output>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setParty((n) => Math.min(12, n + 1))}
                aria-label={t(c.labels.more, l)}
                disabled={party >= 12}
              >
                <Plus className="size-4" />
              </Button>
            </div>
            <p className="mt-2 text-center text-sm text-muted-foreground">
              {t(c.labels.partyHint, l)}
            </p>
            {state.fieldErrors?.partySize ? (
              <p className="mt-2 text-center text-sm text-destructive" role="alert">
                {state.fieldErrors.partySize}
              </p>
            ) : null}
          </Card>
        </section>

        {complements.length > 0 ? (
          <section aria-labelledby="bk-extras">
            <h2 id="bk-extras" className="text-xl font-semibold sm:text-2xl">
              {t(c.labels.addOns, l)}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">{t(c.labels.addOnsHint, l)}</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {complements.map((entry) => {
                const active = addOns.has(entry.slug);
                return (
                  <button
                    key={entry.slug}
                    type="button"
                    onClick={() => toggleAddOn(entry.slug)}
                    aria-pressed={active}
                    className={cn(
                      "flex items-start justify-between gap-3 rounded-xl border p-4 text-left transition-all",
                      active
                        ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                        : "border-border hover:border-primary/50",
                    )}
                  >
                    <span>
                      <span className="block font-medium">{t(entry.title, l)}</span>
                      <span className="mt-0.5 block text-sm text-muted-foreground">
                        {t(entry.tagline, l)}
                      </span>
                      <span className="mt-1 block text-sm font-medium">
                        +{price(entry.priceCents ?? 0)}{" "}
                        <span className="font-normal text-muted-foreground">
                          {t(c.labels.perPerson, l)}
                        </span>
                      </span>
                    </span>
                    <span
                      className={cn(
                        "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors",
                        active
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border",
                      )}
                    >
                      {active && <Check className="size-3" />}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        ) : null}

        <section aria-labelledby="bk-you" className="flex flex-col gap-5">
          <h2 id="bk-you" className="text-xl font-semibold sm:text-2xl">
            {t(c.labels.yourDetails, l)}
          </h2>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name">{t(c.labels.name, l)}</Label>
              <Input
                id="name"
                name="name"
                required
                autoComplete="name"
                enterKeyHint="next"
                defaultValue={state.values?.name}
              />
              {state.fieldErrors?.name ? (
                <p className="text-sm text-destructive" role="alert">
                  {state.fieldErrors.name}
                </p>
              ) : null}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">{t(c.labels.email, l)}</Label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                enterKeyHint="next"
                defaultValue={state.values?.email}
              />
              {state.fieldErrors?.email ? (
                <p className="text-sm text-destructive" role="alert">
                  {state.fieldErrors.email}
                </p>
              ) : null}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="phone">{t(c.labels.phone, l)}</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                autoComplete="tel"
                defaultValue={state.values?.phone}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="message">{t(c.labels.message, l)}</Label>
            <Textarea
              id="message"
              name="message"
              rows={3}
              placeholder={t(c.labels.messagePlaceholder, l)}
              defaultValue={state.values?.message}
            />
          </div>

          {/*
            Marketing opt-in. Never pre-ticked and never a condition of paying —
            the same three requirements of valid consent the enquiry form
            carries (GDPR Art. 4(11), 7(4)), and just as easy to break here.
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
        </section>
      </div>

      <Card className="lg:sticky lg:top-24">
        <CardContent className="space-y-4 p-5">
          <p className="font-heading text-lg font-semibold">{t(c.labels.summary, l)}</p>

          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">{t(signature.title, l)}</dt>
              <dd className="font-medium">
                {price(signature.priceCents ?? 0)} × {party}
              </dd>
            </div>
            {chosenAddOns.map((entry) => (
              <div key={entry.slug} className="flex justify-between gap-3">
                <dt className="text-muted-foreground">{t(entry.title, l)}</dt>
                <dd className="font-medium">
                  {price(entry.priceCents ?? 0)} × {party}
                </dd>
              </div>
            ))}
            <div className="flex justify-between gap-3 border-t pt-2 text-muted-foreground">
              <dt>
                {party} {party === 1 ? t(c.labels.person, l) : t(c.labels.people, l)}
              </dt>
              <dd />
            </div>
          </dl>

          <div className="flex justify-between rounded-lg bg-muted/60 p-3 font-medium">
            <span>{t(c.labels.total, l)}</span>
            <span>{price(total)}</span>
          </div>

          {/*
            The pay button is the last thing on the page on a phone, and the
            fields it validates are all above it. Without this, tapping pay on
            a bad date scrolled nothing, showed nothing where the thumb was,
            and read as "the button is broken" — so whatever went wrong is
            repeated here, next to the control that triggered it.
          */}
          {problem ? (
            <p className="text-sm text-destructive" role="alert">
              {problem}
            </p>
          ) : null}

          {testMode ? (
            <p className="rounded-lg border border-dashed border-input px-3 py-2 text-xs font-medium">
              {t(c.labels.testMode, l)}
            </p>
          ) : null}

          <PayButton locale={l} />

          <p className="text-center text-xs text-muted-foreground">
            {t(c.labels.holdNote, l)}
          </p>

          <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
            <ShieldCheck className="mt-0.5 size-3.5 shrink-0" />
            {t(c.labels.securePayment, l)}
          </p>
        </CardContent>
      </Card>
    </form>
  );
}
