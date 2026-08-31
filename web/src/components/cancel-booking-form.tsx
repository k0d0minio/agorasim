"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

import { cancellationContent } from "@/content/cancellation";
import { t, type Locale } from "@/i18n/config";
import { cancelBookingAction, type CancelState } from "@/app/[locale]/reserva/cancelar/[token]/actions";
import { Button } from "@/components/ui/button";

/**
 * The confirm-before-cancel step.
 *
 * **Two presses, and the safe one is the default.** The first press only asks
 * the question; the second performs it. This is a destructive, irreversible
 * action reached by tapping a link in an email — often on a phone, often one
 * -handed — and a single mistap must not refund somebody's tour. "Keep booking"
 * comes first in the DOM, so it is what a keyboard lands on and what a screen
 * reader reads first, and it is the button that carries the visual weight.
 *
 * **The destructive button says what it does.** Not "Yes" — "Yes, cancel and
 * refund". A guest reading only the button should still know the outcome.
 *
 * Client-side only for the disclosure; the decision itself is entirely the
 * Server Function's. Nothing here is trusted, and there is nothing here worth
 * trusting: the token in the hidden field is re-resolved on the server, and the
 * 48-hour window is re-checked adjacent to the write.
 */
export function CancelBookingForm({
  locale,
  token,
}: {
  locale: Locale;
  token: string;
}) {
  const [state, formAction] = useActionState<CancelState, FormData>(cancelBookingAction, {});
  const [asked, setAsked] = useState(false);
  const c = cancellationContent;

  // The success panel is rendered here rather than handed down from the page,
  // because a Server Component cannot pass a function across the boundary and
  // the amount refunded is only known once the action has returned.
  if (state.done) {
    return (
      <div className="mt-6 rounded-lg border bg-secondary/30 p-5" role="status">
        <p className="font-medium">{t(c.done.title, locale)}</p>
        <p className="mt-2 text-sm text-muted-foreground">
          {fill(t(c.done.lead, locale), { total: state.total ?? "" })}
        </p>
        <p className="mt-3 text-sm text-muted-foreground">{t(c.done.outro, locale)}</p>
      </div>
    );
  }

  return (
    <form action={formAction} className="mt-6">
      <input type="hidden" name="token" value={token} />
      <input type="hidden" name="locale" value={locale} />

      {state.error ? (
        <p className="mb-4 text-sm text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}

      {asked ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
          <p className="text-sm font-medium">{t(c.confirm.question, locale)}</p>
          {/*
            Reverse order on a narrow screen — `flex-col-reverse` puts "Keep"
            under the thumb and the destructive one further away, while the DOM
            order keeps "Keep" first for focus and screen readers.
          */}
          <div className="mt-4 flex flex-col-reverse gap-3 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={() => setAsked(false)}
            >
              {t(c.confirm.keep, locale)}
            </Button>
            <ConfirmButton locale={locale} />
          </div>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="lg"
          onClick={() => setAsked(true)}
          className="border-destructive/40 text-destructive hover:bg-destructive/5 hover:text-destructive"
        >
          {t(c.confirm.cancel, locale)}
        </Button>
      )}
    </form>
  );
}

/** The one placeholder this component substitutes. */
function fill(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? values[key] : match,
  );
}

/**
 * Split out so `useFormStatus` reads the state of the form it is inside — the
 * hook reports on the nearest parent `<form>`, so it cannot live in the
 * component that renders that form.
 */
function ConfirmButton({ locale }: { locale: Locale }) {
  const { pending } = useFormStatus();
  const c = cancellationContent;
  return (
    <Button type="submit" variant="destructive" size="lg" disabled={pending}>
      {pending ? t(c.confirm.pending, locale) : t(c.confirm.cancel, locale)}
    </Button>
  );
}
