"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { ArrowLeft, Clock, CheckCircle2, Loader2, Lock } from "lucide-react";

import { quotePageContent } from "@/content/quote-page";
import { termsContent } from "@/content/terms";
import { t, type Locale } from "@/i18n/config";
import { fillTemplate } from "@/lib/fill-template";
import { documentLoadedOnPaymentRoute } from "@/lib/payment-route";
import { href } from "@/lib/routes";
import {
  payQuote,
  type EmbeddedQuotePayment,
  type QuotePayState,
} from "@/app/[locale]/orcamento/actions";
import { EmbeddedCheckout } from "@/components/embedded-checkout";
import { QuoteNotice } from "@/components/quote-notice";
import { Button } from "@/components/ui/button";

/**
 * The quote page's pay button — the one control on the page — and the payment
 * step it opens in its place.
 *
 * **The server decides, not this component.** The page rendered what was due
 * when it was loaded; the action re-reads it, because a page left open for a
 * day may be looking at a balance that has fallen due, or a deposit that was
 * paid from another phone. Everything shown after a tap is what the action
 * returned.
 *
 * **Stripe's form, where the button was.** A tap that opens a payment swaps
 * the button block for the payment step: a line naming the instalment and its
 * amount, Stripe's embedded form, and "back". Back is this component's own
 * state and nothing else — no server call, no session released: a quote holds
 * no car, and the next tap within the hour gets the same open session back
 * (`lib/quote-checkout.ts`). Paying sends the tab back to this page with
 * `?session_id=`, where the page records it as it always has.
 *
 * The notice under the button is a sentence, not a checkbox, as at the tour
 * checkout (`terms.ts` → `checkoutNotice`): the button's label already says
 * what pressing it does, and the conditions are directly above it.
 */
export function QuotePayForm({
  locale,
  token,
  label,
  instalment,
  amount,
}: {
  locale: Locale;
  /** Echoed back on submit — it is already in the URL this page was reached by. */
  token: string;
  /** "Pagar sinal de 576 €" — already filled in by the page. */
  label: string;
  /** "Sinal" — what the payment step's heading calls this instalment. */
  instalment: string;
  /** "576 €" — the instalment's amount, formatted by the page. */
  amount: string;
}) {
  const c = quotePageContent;
  const [state, formAction] = useActionState<QuotePayState, FormData>(payQuote, {
    status: "idle",
  });
  // The payment step the couple went back from, so its answer stops showing.
  const [closed, setClosed] = useState<EmbeddedQuotePayment | null>(null);

  /*
   * Stripe's form needs this document to have been *loaded* on a payment route,
   * under the policy that admits it (`lib/payment-route.ts`). The quote page is
   * reached from an email, so it always is; this is the backstop for a link
   * that one day arrives client-side, and reloads once before anything is
   * typed.
   */
  useEffect(() => {
    if (!documentLoadedOnPaymentRoute()) window.location.reload();
  }, []);

  if (state.status === "payment" && state.payment !== closed) {
    const { payment } = state;
    return (
      <PaymentStep
        locale={locale}
        payment={payment}
        heading={fillTemplate(c.paymentStep.heading, { instalment, amount })}
        onBack={() => setClosed(payment)}
      />
    );
  }

  if (state.status === "paid" || state.status === "awaiting") {
    const copy = state.status === "paid" ? c.confirming : c.awaiting;
    return (
      <QuoteNotice
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
    return <QuoteNotice title={t(c.invalid.title, locale)} body={t(c.invalid.body, locale)} />;
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

/**
 * Stripe's form in the quote page, under what is being paid, with the way
 * back to the button. Full width of the page's column — on a phone, the
 * screen.
 */
function PaymentStep({
  locale,
  payment,
  heading,
  onBack,
}: {
  locale: Locale;
  payment: EmbeddedQuotePayment;
  heading: string;
  onBack: () => void;
}) {
  const c = quotePageContent;
  const back = (
    <Button type="button" variant="outline" onClick={onBack} className="min-h-11 w-full sm:w-auto">
      <ArrowLeft className="size-4" />
      {t(c.paymentStep.back, locale)}
    </Button>
  );

  return (
    <section aria-labelledby="quote-pay" className="flex flex-col gap-4">
      <h2 id="quote-pay" className="text-xl font-semibold">
        {heading}
      </h2>
      <div>{back}</div>
      <EmbeddedCheckout
        key={payment.clientSecret}
        clientSecret={payment.clientSecret}
        publishableKey={payment.publishableKey}
        stripeAccount={payment.stripeAccount}
        locale={locale}
        loading={t(c.paymentStep.loading, locale)}
        failure={
          <div className="flex flex-col gap-3 rounded-xl border border-destructive/40 px-4 py-3 text-sm">
            <p>{t(c.paymentStep.failed, locale)}</p>
            <div>{back}</div>
          </div>
        }
      />
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Lock className="size-3.5 shrink-0" />
        {t(c.pay.secure, locale)}
      </p>
    </section>
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
