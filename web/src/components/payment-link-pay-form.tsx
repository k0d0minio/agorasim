"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Clock, Loader2, Lock } from "lucide-react";

import { paymentLinkContent } from "@/content/payment-link";
import { termsContent } from "@/content/terms";
import { t, type Locale } from "@/i18n/config";
import { fillTemplate } from "@/lib/fill-template";
import { documentLoadedOnPaymentRoute } from "@/lib/payment-route";
import { href } from "@/lib/routes";
import {
  payLink,
  type EmbeddedLinkPayment,
  type LinkPayState,
} from "@/app/[locale]/reservar/pagar/actions";
import { EmbeddedCheckout } from "@/components/embedded-checkout";
import { QuoteNotice } from "@/components/quote-notice";
import { Button } from "@/components/ui/button";

/**
 * The payment-link page's pay button, and the payment step it opens in its
 * place — the quote page's form (`quote-pay-form.tsx`) for a tour.
 *
 * **The server decides, not this component.** The page rendered the booking
 * as it stood; the action re-checks the departure, because a page left open
 * for a day may be looking at a morning that has since sold out. Everything
 * shown after a tap is what the action returned.
 *
 * **Back is this component's own state.** No session is released: the next
 * tap within the half hour gets the same open session back, so going back and
 * forth never holds two cars (`lib/payment-link.ts`). Paying sends the tab to
 * `/reservar/confirmacao`, which confirms it as it does for every checkout.
 */
export function PaymentLinkPayForm({
  locale,
  token,
  amount,
}: {
  locale: Locale;
  /** Echoed back on submit — it is already in the URL this page was reached by. */
  token: string;
  /** "340 €" — already formatted by the page. */
  amount: string;
}) {
  const c = paymentLinkContent;
  const [state, formAction] = useActionState<LinkPayState, FormData>(payLink, {
    status: "idle",
  });
  // The payment step the customer went back from, so its answer stops showing.
  const [closed, setClosed] = useState<EmbeddedLinkPayment | null>(null);

  // Stripe's form needs this document to have been loaded on a payment route
  // (`lib/payment-route.ts`). The link comes from an email, so it always is;
  // this is the backstop, as on the quote page.
  useEffect(() => {
    if (!documentLoadedOnPaymentRoute()) window.location.reload();
  }, []);

  if (state.status === "payment" && state.payment !== closed) {
    const { payment } = state;
    return (
      <PaymentStep
        locale={locale}
        payment={payment}
        heading={fillTemplate(t(c.paymentStep.heading, locale), { amount })}
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

  if (state.status === "closed") {
    return <QuoteNotice title={t(c.closed.title, locale)} body={t(c.closed.body, locale)} />;
  }

  if (state.status === "invalid") {
    return <QuoteNotice title={t(c.invalid.title, locale)} body={t(c.invalid.body, locale)} />;
  }

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="token" value={token} />
      <input type="hidden" name="locale" value={locale} />
      <SubmitButton label={fillTemplate(t(c.pay.button, locale), { amount })} />
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

/** Stripe's form in the page, under what is being paid, with the way back. */
function PaymentStep({
  locale,
  payment,
  heading,
  onBack,
}: {
  locale: Locale;
  payment: EmbeddedLinkPayment;
  heading: string;
  onBack: () => void;
}) {
  const c = paymentLinkContent;
  const back = (
    <Button type="button" variant="outline" onClick={onBack} className="min-h-11 w-full sm:w-auto">
      <ArrowLeft className="size-4" />
      {t(c.paymentStep.back, locale)}
    </Button>
  );

  return (
    <section aria-labelledby="link-pay" className="flex flex-col gap-4">
      <h2 id="link-pay" className="text-xl font-semibold">
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
    // Full width on a phone, where the customer will read this; ≥44px tall.
    <Button type="submit" size="lg" className="min-h-11 w-full sm:w-auto" disabled={pending}>
      {pending ? <Loader2 className="size-4 animate-spin" /> : null}
      {label}
    </Button>
  );
}
