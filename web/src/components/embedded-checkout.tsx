"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { loadStripe } from "@stripe/stripe-js/pure";

import type { Locale } from "@/i18n/config";

/**
 * Stripe's Checkout form, mounted inside our own page.
 *
 * Generic on purpose: the booking page uses it today, and a quote's deposit or
 * balance is the same session with a different `return_url` — whatever page
 * shows a payment passes the session's client secret and what to say while it
 * loads or if it cannot.
 *
 * **Stripe's script loads here, and only here.** `@stripe/stripe-js/pure`
 * rather than the package root, because the root module injects
 * `js.stripe.com` the moment it is imported — onto every page that happens to
 * share a bundle with this one. The pure entry waits for {@link loadStripe},
 * which runs when this component mounts: after "Pay" has created a session,
 * never on page load. Only the booking route's policy admits the script
 * (`PAYMENT_CSP`, `lib/security-headers.ts`); anywhere else it is refused and
 * this component shows its failure.
 *
 * **One form at a time.** Stripe allows a single embedded Checkout per page,
 * so a mount waits for the previous instance to be destroyed — which matters
 * when React mounts, unmounts and remounts in quick succession (development's
 * strict mode, or a guest going back and paying again).
 */
let previous: Promise<unknown> = Promise.resolve();

export function EmbeddedCheckout({
  clientSecret,
  publishableKey,
  stripeAccount,
  locale,
  loading,
  failure,
}: {
  clientSecret: string;
  publishableKey: string;
  /** The connected account a direct charge lives on; `null` for the platform. */
  stripeAccount: string | null;
  locale: Locale;
  /** Shown until Stripe's form has mounted. */
  loading: ReactNode;
  /** Shown instead of the form when it cannot load — never a redirect to Stripe. */
  failure: ReactNode;
}) {
  const container = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "failed">("loading");

  useEffect(() => {
    let cancelled = false;
    let destroy: (() => void) | null = null;

    const run = previous.then(async () => {
      if (cancelled) return;
      const stripe = await loadStripe(publishableKey, {
        ...(stripeAccount ? { stripeAccount } : {}),
        locale,
      });
      if (!stripe) throw new Error("Stripe.js did not load");
      const checkout = await stripe.createEmbeddedCheckoutPage({ clientSecret });
      if (cancelled || !container.current) {
        checkout.destroy();
        return;
      }
      checkout.mount(container.current);
      destroy = () => checkout.destroy();
      setStatus("ready");
    });
    previous = run.catch(() => undefined);

    run.catch((err: unknown) => {
      if (cancelled) return;
      console.error("[checkout] the embedded payment form could not load", err);
      setStatus("failed");
    });

    return () => {
      cancelled = true;
      destroy?.();
    };
  }, [clientSecret, publishableKey, stripeAccount, locale]);

  return (
    <div>
      {status === "loading" ? (
        <p role="status" className="py-6 text-center text-sm text-muted-foreground">
          {loading}
        </p>
      ) : null}
      {status === "failed" ? <div role="alert">{failure}</div> : null}
      {/* Stripe's iframe goes in here; it sizes itself to its content. */}
      <div ref={container} hidden={status === "failed"} />
    </div>
  );
}
