"use client";

import { useState } from "react";
import Image from "next/image";
import { Check, Lock, Minus, Plus, ShieldCheck } from "lucide-react";
import { t, type Locale } from "@/i18n/config";
import { bookingContent } from "@/content/booking";
import { experiences, complementExperiences } from "@/content/experiences";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

function previewPrice(slug: string): number {
  return bookingContent.previewPrices[slug] ?? bookingContent.previewPriceFallback;
}

/**
 * Interactive design preview of the instant-booking flow (proposal Feature 3).
 * All state is local — nothing is persisted and the pay button stays locked
 * until Stripe is wired in. Kept interactive so Diogo & Rita can feel exactly
 * how a guest will move through it on a phone.
 */
export function BookingFlow({ locale }: { locale: Locale }) {
  const c = bookingContent;
  const l = locale;
  const signature = experiences.find((e) => e.kind === "signature") ?? experiences[0];

  const [experienceSlug, setExperienceSlug] = useState(signature.slug);
  const [day, setDay] = useState<number | null>(null);
  const [party, setParty] = useState(2);
  const [addOns, setAddOns] = useState<Set<string>>(new Set());
  const [payMode, setPayMode] = useState<"deposit" | "full">("deposit");

  const chosen = experiences.find((e) => e.slug === experienceSlug) ?? signature;
  const basePerPerson = previewPrice(chosen.slug);
  const addOnPerPerson = [...addOns].reduce((sum, slug) => sum + previewPrice(slug), 0);
  const total = (basePerPerson + addOnPerPerson) * party;
  const dueToday = payMode === "deposit" ? Math.round(total * 0.3) : total;

  const steps = [c.steps.experience, c.steps.date, c.steps.extras, c.steps.payment];

  function toggleAddOn(slug: string) {
    setAddOns((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  }

  const cal = c.calendar;
  const dayCells: (number | null)[] = [
    ...Array.from({ length: cal.firstDayColumn }, () => null),
    ...Array.from({ length: cal.daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px] lg:items-start">
      <div className="flex flex-col gap-10">
        {/* Step rail */}
        <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
          {steps.map((step, i) => (
            <li key={i} className="flex items-center gap-2">
              <span className="flex size-5 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                {i + 1}
              </span>
              <span className="font-medium text-foreground/80">{t(step, l)}</span>
              {i < steps.length - 1 && <span aria-hidden className="text-border">—</span>}
            </li>
          ))}
        </ol>

        {/* 1 — Experience */}
        <section aria-labelledby="bk-exp">
          <h2 id="bk-exp" className="text-xl font-semibold sm:text-2xl">
            {t(c.labels.chooseExperience, l)}
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {experiences
              .filter((e) => e.kind === "signature")
              .map((exp) => {
                const active = experienceSlug === exp.slug;
                return (
                  <button
                    key={exp.slug}
                    type="button"
                    onClick={() => setExperienceSlug(exp.slug)}
                    aria-pressed={active}
                    className={cn(
                      "overflow-hidden rounded-xl border text-left transition-all",
                      active
                        ? "border-primary ring-2 ring-primary/30"
                        : "border-border hover:border-primary/50",
                    )}
                  >
                    <div className="relative aspect-video w-full">
                      <Image
                        src={exp.image}
                        alt={t(exp.imageAlt, l)}
                        fill
                        sizes="(max-width: 640px) 100vw, 400px"
                        className="object-cover"
                      />
                      {active && (
                        <span className="absolute top-2 right-2 flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
                          <Check className="size-3.5" />
                        </span>
                      )}
                    </div>
                    <div className="space-y-1 p-4">
                      <p className="font-heading text-lg font-semibold">{t(exp.title, l)}</p>
                      <p className="text-sm text-muted-foreground">{t(exp.tagline, l)}</p>
                      <p className="pt-1 text-sm font-medium">
                        €{previewPrice(exp.slug)}{" "}
                        <span className="font-normal text-muted-foreground">
                          {t(c.labels.perPerson, l)} · {t(exp.duration, l)}
                        </span>
                      </p>
                    </div>
                  </button>
                );
              })}
          </div>
        </section>

        {/* 2 — Date & group */}
        <section aria-labelledby="bk-date" className="grid gap-6 sm:grid-cols-2">
          <div>
            <h2 id="bk-date" className="text-xl font-semibold sm:text-2xl">
              {t(c.labels.chooseDate, l)}
            </h2>
            <Card className="mt-4 p-4">
              <p className="text-center text-sm font-semibold">{t(cal.monthLabel, l)}</p>
              <div className="mt-3 grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
                {t(cal.weekdays, l).map((d, i) => (
                  <span key={i} className="py-1 font-medium">
                    {d}
                  </span>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {dayCells.map((d, i) =>
                  d === null ? (
                    <span key={`x${i}`} />
                  ) : (
                    <button
                      key={d}
                      type="button"
                      disabled={cal.unavailable.includes(d)}
                      onClick={() => setDay(d)}
                      aria-pressed={day === d}
                      className={cn(
                        "aspect-square rounded-lg text-sm transition-colors",
                        day === d
                          ? "bg-primary font-semibold text-primary-foreground"
                          : "hover:bg-muted",
                        cal.unavailable.includes(d) &&
                          "cursor-not-allowed text-muted-foreground/40 line-through hover:bg-transparent",
                      )}
                    >
                      {d}
                    </button>
                  ),
                )}
              </div>
            </Card>
          </div>

          <div>
            <h2 className="text-xl font-semibold sm:text-2xl">{t(c.labels.partySize, l)}</h2>
            <Card className="mt-4 p-4">
              <div className="flex items-center justify-center gap-6 py-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setParty((p) => Math.max(1, p - 1))}
                  aria-label="−1"
                >
                  <Minus className="size-4" />
                </Button>
                <span className="min-w-10 text-center font-heading text-3xl font-semibold">
                  {party}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setParty((p) => Math.min(12, p + 1))}
                  aria-label="+1"
                >
                  <Plus className="size-4" />
                </Button>
              </div>
              <p className="mt-2 text-center text-sm text-muted-foreground">
                {t(c.labels.partyHint, l)}
              </p>
            </Card>
          </div>
        </section>

        {/* 3 — Add-ons */}
        <section aria-labelledby="bk-extras">
          <h2 id="bk-extras" className="text-xl font-semibold sm:text-2xl">
            {t(c.labels.addOns, l)}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">{t(c.labels.addOnsHint, l)}</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {complementExperiences.map((exp) => {
              const active = addOns.has(exp.slug);
              return (
                <button
                  key={exp.slug}
                  type="button"
                  onClick={() => toggleAddOn(exp.slug)}
                  aria-pressed={active}
                  className={cn(
                    "flex items-start justify-between gap-3 rounded-xl border p-4 text-left transition-all",
                    active
                      ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                      : "border-border hover:border-primary/50",
                  )}
                >
                  <span>
                    <span className="block font-medium">{t(exp.title, l)}</span>
                    <span className="mt-0.5 block text-sm text-muted-foreground">
                      {t(exp.tagline, l)}
                    </span>
                    <span className="mt-1 block text-sm font-medium">
                      +€{previewPrice(exp.slug)}{" "}
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

        {/* 4 — Payment mode */}
        <section aria-labelledby="bk-pay">
          <h2 id="bk-pay" className="text-xl font-semibold sm:text-2xl">
            {t(c.labels.payment, l)}
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {(
              [
                { mode: "deposit" as const, label: c.labels.deposit, hint: c.labels.depositHint },
                { mode: "full" as const, label: c.labels.full, hint: c.labels.fullHint },
              ]
            ).map(({ mode, label, hint }) => (
              <button
                key={mode}
                type="button"
                onClick={() => setPayMode(mode)}
                aria-pressed={payMode === mode}
                className={cn(
                  "rounded-xl border p-4 text-left transition-all",
                  payMode === mode
                    ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                    : "border-border hover:border-primary/50",
                )}
              >
                <p className="font-medium">{t(label, l)}</p>
                <p className="mt-0.5 text-sm text-muted-foreground">{t(hint, l)}</p>
              </button>
            ))}
          </div>
        </section>
      </div>

      {/* Summary — sticky on desktop, flows after the steps on mobile */}
      <Card className="lg:sticky lg:top-24">
        <CardContent className="space-y-4 p-5">
          <p className="font-heading text-lg font-semibold">{t(c.labels.summary, l)}</p>

          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">{t(chosen.title, l)}</dt>
              <dd className="font-medium">
                €{basePerPerson} × {party}
              </dd>
            </div>
            {[...addOns].map((slug) => {
              const exp = complementExperiences.find((e) => e.slug === slug);
              if (!exp) return null;
              return (
                <div key={slug} className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">{t(exp.title, l)}</dt>
                  <dd className="font-medium">
                    €{previewPrice(slug)} × {party}
                  </dd>
                </div>
              );
            })}
            <div className="flex justify-between gap-3 border-t pt-2">
              <dt className="text-muted-foreground">
                {day !== null
                  ? `${day} · ${t(cal.monthLabel, l)}`
                  : t(c.labels.noDate, l)}
              </dt>
              <dd className="text-muted-foreground">
                {party} {party === 1 ? t(c.labels.person, l) : t(c.labels.people, l)}
              </dd>
            </div>
          </dl>

          <div className="space-y-1.5 rounded-lg bg-muted/60 p-3 text-sm">
            <div className="flex justify-between font-medium">
              <span>{t(c.labels.total, l)}</span>
              <span>€{total}</span>
            </div>
            <div className="flex justify-between text-primary">
              <span className="font-medium">{t(c.labels.dueToday, l)}</span>
              <span className="font-semibold">€{dueToday}</span>
            </div>
            {payMode === "deposit" && (
              <div className="flex justify-between text-muted-foreground">
                <span>{t(c.labels.dueOnDay, l)}</span>
                <span>€{total - dueToday}</span>
              </div>
            )}
          </div>
          <p className="text-xs text-muted-foreground">{t(c.labels.examplePrices, l)}</p>

          <div className="space-y-2">
            <Button type="button" size="lg" className="w-full" disabled>
              <Lock className="size-4" />
              {t(c.labels.pay, l)}
            </Button>
            <p className="text-center text-xs text-muted-foreground">{t(c.labels.payNote, l)}</p>
          </div>

          <div className="flex flex-wrap justify-center gap-1.5">
            {c.paymentMethods.map((m) => (
              <Badge key={m} variant="outline" className="text-muted-foreground">
                {m}
              </Badge>
            ))}
          </div>

          <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
            <ShieldCheck className="mt-0.5 size-3.5 shrink-0" />
            {t(c.labels.securePayment, l)}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
