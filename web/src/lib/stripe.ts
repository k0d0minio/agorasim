/**
 * The Stripe client, and the question of whether Stripe is switched on at all.
 *
 * **Both halves matter.** The launch plan's biggest external risk is Stripe
 * activation slipping past the window (identity checks are not ours to hurry),
 * and its fallback is to ship the site with slot-pick and pay offline. That
 * fallback is not a branch or a revert — it is simply this deployment with no
 * `STRIPE_SECRET_KEY` set. {@link isStripeConfigured} is the switch, and every
 * surface that could take money asks it first: `/reservar` offers the enquiry
 * form instead, and the checkout action refuses rather than half-selling.
 *
 * The client is created lazily, for the same reason `db` is: importing this
 * module — which `next build` does while collecting Server Actions — must not
 * require a key. Only actually charging somebody does.
 */
import "server-only";

import Stripe from "stripe";

/**
 * Pinned deliberately. Stripe's API is versioned per account, and an SDK that
 * follows whatever the dashboard is set to can change the shape of a webhook
 * payload without a deploy. This is the version this code was written against.
 */
const API_VERSION = "2026-07-29.dahlia";

let client: Stripe | null = null;

/** Whether this deployment can take a payment. */
export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY?.trim());
}

/** Whether this deployment can verify a webhook it is sent. */
export function isWebhookConfigured(): boolean {
  return Boolean(process.env.STRIPE_WEBHOOK_SECRET?.trim());
}

/**
 * The Stripe client. Throws when unconfigured — callers are expected to have
 * asked {@link isStripeConfigured} first and offered something else.
 */
export function stripe(): Stripe {
  if (client) return client;

  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) {
    throw new Error(
      "STRIPE_SECRET_KEY is not set — payments are unavailable. " +
        "This is a supported state: check isStripeConfigured() before charging.",
    );
  }

  client = new Stripe(key, {
    apiVersion: API_VERSION,
    // Vercel's runtime has `fetch` and no long-lived sockets; the HTTP client
    // that suits that is the same choice `db` makes with Neon's driver.
    httpClient: Stripe.createFetchHttpClient(),
  });
  return client;
}

/**
 * Where Stripe sends the guest back to.
 *
 * `NEXT_PUBLIC_SITE_URL` in production; the Vercel-provided URL on a preview
 * deployment, so a preview's checkout returns to that preview rather than to
 * production. Localhost last, which is what a developer gets.
 */
export function siteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");

  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;
  if (vercel) return `https://${vercel}`;

  return "http://localhost:3000";
}

/**
 * Whether a key is a test-mode key.
 *
 * Used to label the checkout screen, so nobody demonstrates the flow on a phone
 * and comes away believing a real payment was taken — the ticket asks for
 * exactly that rehearsal.
 */
export function isTestMode(): boolean {
  return (process.env.STRIPE_SECRET_KEY ?? "").startsWith("sk_test_");
}
