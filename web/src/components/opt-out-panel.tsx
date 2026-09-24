"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { CheckCircle2, HelpCircle, MailX } from "lucide-react";

import { optOutContent } from "@/content/opt-out";
import { site } from "@/content/site";
import { t, type Locale } from "@/i18n/config";
import { href } from "@/lib/routes";
import {
  optOutFromLink,
  type OptOutState,
} from "@/app/[locale]/reserva/deixar-de-receber/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

/**
 * The opt-out page below the token check the server already did.
 *
 * **One button, and the button is the write.** The page render records
 * nothing — a link scanner that fetches it changes nothing — and the POST
 * behind the button is what puts the address on the list. Pressing it twice
 * reads as done both times.
 */
export function OptOutPanel({
  locale,
  token,
  alreadyDone,
}: {
  locale: Locale;
  /** Echoed back on submit — it is already in the URL this page was reached by. */
  token: string;
  /** The address was already on the list when the page was rendered. */
  alreadyDone: boolean;
}) {
  const c = optOutContent;
  const [state, formAction] = useActionState<OptOutState, FormData>(optOutFromLink, {
    status: "idle",
  });

  if (alreadyDone || state.status === "done") return <OptOutDonePanel locale={locale} />;
  if (state.status === "invalid") return <OptOutInvalidPanel locale={locale} />;

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex size-11 items-center justify-center rounded-xl bg-muted text-muted-foreground">
          <MailX className="size-5" />
        </div>
        <h1 className="mt-4 font-heading text-2xl font-semibold">{t(c.title, locale)}</h1>
        <p className="mt-2 text-muted-foreground">{t(c.lead, locale)}</p>
        <p className="mt-2 text-sm text-muted-foreground">{t(c.keeps, locale)}</p>

        {state.status === "error" ? (
          <p role="alert" className="mt-4 text-sm font-medium text-destructive">
            {t(c.errors[state.error], locale)}
          </p>
        ) : null}

        <form action={formAction} className="mt-6">
          <input type="hidden" name="token" value={token} />
          <SubmitButton locale={locale} />
        </form>
      </CardContent>
    </Card>
  );
}

function SubmitButton({ locale }: { locale: Locale }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" disabled={pending}>
      {pending ? t(optOutContent.working, locale) : t(optOutContent.button, locale)}
    </Button>
  );
}

export function OptOutDonePanel({ locale }: { locale: Locale }) {
  return (
    <Panel
      tone="good"
      icon={<CheckCircle2 className="size-5" />}
      title={t(optOutContent.doneTitle, locale)}
      lead={t(optOutContent.doneLead, locale)}
      locale={locale}
    />
  );
}

/** The one answer a malformed, forged or unverifiable link gets — it reveals nothing. */
export function OptOutInvalidPanel({ locale }: { locale: Locale }) {
  return (
    <Panel
      tone="wait"
      icon={<HelpCircle className="size-5" />}
      title={t(optOutContent.invalidTitle, locale)}
      lead={t(optOutContent.invalidLead, locale).replace("{email}", site.email)}
      locale={locale}
    />
  );
}

function Panel({
  tone,
  icon,
  title,
  lead,
  locale,
}: {
  tone: "good" | "wait";
  icon: React.ReactNode;
  title: string;
  lead: string;
  locale: Locale;
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
        <div className="mt-8">
          <Button asChild size="lg" variant="outline">
            <Link href={href(locale, "home")}>{t(optOutContent.backHome, locale)}</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
