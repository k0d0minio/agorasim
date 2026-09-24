"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { Clock, CheckCircle2, Loader2, Lock } from "lucide-react";

import { quotePageContent } from "@/content/quote-page";
import { termsContent } from "@/content/terms";
import { t, type Locale } from "@/i18n/config";
import { href } from "@/lib/routes";
import { payQuote, type QuotePayState } from "@/app/[locale]/orcamento/actions";
import { Button } from "@/components/ui/button";

/**
 * The quote page's pay button — the one control on the page.
 *
 * **The server decides, not this component.** The page rendered what was due
 * when it was loaded; the action re-reads it, because a page left open for a
 * day may be looking at a balance that has fallen due, or a deposit that was
 * paid from another phone. Everything shown after a tap is what the action
 * returned.
 *
 * The notice under the button is a sentence, not a checkbox, as at the tour
 * checkout (`terms.ts` → `checkoutNotice`): the button's label already says
 * what pressing it does, and the conditions are directly above it.
 */
export function QuotePayForm({
  locale,
  token,
  label,
}: {
  locale: Locale;
  /** Echoed back on submit — it is already in the URL this page was reached by. */
  token: string;
  /** "Pagar sinal de 576 €" — already filled in by the page. */
  label: string;
}) {
  const c = quotePageContent;
  const [state, formAction] = useActionState<QuotePayState, FormData>(payQuote, {
    status: "idle",
  });

  if (state.status === "paid" || state.status === "awaiting") {
    const copy = state.status === "paid" ? c.confirming : c.awaiting;
    return (
      <Notice
        icon={
          state.status === "paid" ? (
            <CheckCircle2 className="size-5" />
          ) : (
            <Clock className="size-5" />
          )
        }
        title={t(copy.title, locale)}
        body={t(copy.body, locale)}
      />
    );
  }

  if (state.status === "invalid") {
    return <Notice title={t(c.invalid.title, locale)} body={t(c.invalid.body, locale)} />;
  }

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="token" value={token} />
      <input type="hidden" name="locale" value={locale} />
      <SubmitButton label={label} />
      {state.status === "refused" ? (
        <p role="alert" className="text-sm text-destructive">
          {t(c.refused[state.reason], locale)}
        </p>
      ) : null}
      <p className="text-sm text-muted-foreground">
        {t(c.pay.notice, locale)}{" "}
        <Link href={href(locale, "termos")} className="underline hover:text-primary">
          {t(termsContent.checkoutNotice.linkLabel, locale)}
        </Link>
        .
      </p>
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Lock className="size-3.5 shrink-0" />
        {t(c.pay.secure, locale)}
      </p>
    </form>
  );
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    // Full width on a phone, where the couple will read this; ≥44px tall.
    <Button type="submit" size="lg" className="min-h-11 w-full sm:w-auto" disabled={pending}>
      {pending ? <Loader2 className="size-4 animate-spin" /> : null}
      {label}
    </Button>
  );
}

function Notice({
  icon,
  title,
  body,
}: {
  icon?: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div role="status" className="flex items-start gap-3 rounded-xl border bg-muted/40 p-4">
      {icon ? <span className="mt-0.5 text-primary">{icon}</span> : null}
      <div>
        <p className="font-medium">{title}</p>
        <p className="mt-1 text-sm text-muted-foreground">{body}</p>
      </div>
    </div>
  );
}
