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
 *
 * **Whose account the money lands in is the other half.** The commission
 * agreement (§3) is explicit that the guest pays Agorasim directly: they hold
 * the Stripe account, they are the merchant of record, the customer data is
 * theirs, and they bear Stripe's processing fee. The platform is linked to that
 * account through Connect and is paid an *application fee* out of each payment
 * — no invoice, no transfer, neither side ever handling the other's money by
 * hand. In Stripe's vocabulary that arrangement is a **direct charge**: the
 * session, the payment intent, the charge and any refund all live on the
 * connected account, and every call about one of them has to say so.
 *
 * {@link connectedAccountId} is the switch, and unset is today's state and a
 * supported one — the client's account does not exist yet, and until it does
 * every charge is a plain platform charge exactly as before, with no fee taken:
 * a charge the platform owns has nothing to split, and Stripe refuses an
 * application fee on one. Configured, the commission rides on every checkout
 * (`lib/commission.ts`, wired in `lib/booking-checkout.ts`).
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
 * Whether a key is a test-mode key.
 *
 * Used to label the checkout screen, so nobody demonstrates the flow on a phone
 * and comes away believing a real payment was taken — the ticket asks for
 * exactly that rehearsal.
 */
export function isTestMode(): boolean {
  return (process.env.STRIPE_SECRET_KEY ?? "").startsWith("sk_test_");
}

/**
 * The client's connected account, or `null` when this deployment charges its
 * own — see the module note for what that distinction buys.
 *
 * A value that is not an account id is a configuration error, not a missing
 * feature, so it throws rather than falling back. Quietly reverting to
 * platform-only because somebody mistyped the id would take a guest's money
 * into the wrong account, which is the one outcome worse than refusing the
 * sale. The value itself is kept out of the message: an id is not a secret,
 * but a mis-pasted key in that field would be, and it would be in the logs.
 */
export function connectedAccountId(): string | null {
  const id = process.env.STRIPE_CONNECTED_ACCOUNT_ID?.trim();
  if (!id) return null;
  if (!id.startsWith("acct_")) {
    throw new Error(
      "STRIPE_CONNECTED_ACCOUNT_ID is not a Stripe account id (they start with " +
        "`acct_`). Payments are refused rather than charged to the wrong account.",
    );
  }
  return id;
}

/** Whether charges are made on the client's account rather than the platform's. */
export function isConnectConfigured(): boolean {
  return connectedAccountId() !== null;
}

/**
 * Request options that put a call on the connected account, merged onto
 * whatever the caller already needed — an idempotency key, an expansion.
 *
 * When Connect is unconfigured the caller's options come back untouched, so
 * the platform-only path sends exactly the request it sends today.
 *
 * `stripeAccount` rather than the SDK's newer `stripeContext`, which its own
 * types now recommend for new code. The two are documented as identical today,
 * and this one is the vocabulary the rest of the flow already speaks: the
 * webhook decides what to act on by comparing `event.account`. Nothing here has
 * been run against a live connected account yet, so the field that has been
 * carrying direct charges for a decade wins over the field that has not; it is
 * a one-line change once the sandbox flow is exercised.
 */
export function onConnectedAccount(
  options?: Stripe.RequestOptions,
): Stripe.RequestOptions | undefined {
  const stripeAccount = connectedAccountId();
  if (!stripeAccount) return options;
  return { ...options, stripeAccount };
}

/**
 * Run one Stripe operation against whichever account owns the object.
 *
 * Stripe objects are not portable between accounts: a session created before
 * `STRIPE_CONNECTED_ACCOUNT_ID` was set lives on the platform, and asking the
 * connected account about it gets "no such session". Bookings taken either side
 * of that switch still have to be confirmable and refundable, so a lookup that
 * comes back missing on the connected account is retried on the platform.
 *
 * Only `resource_missing` is retried, and only in that direction. Any other
 * Stripe error means the account was right and the request was not — re-sending
 * it to a second account would turn one clear failure into two confusing ones.
 */
export async function onOwningAccount<T>(
  run: (options?: Stripe.RequestOptions) => Promise<T>,
): Promise<T> {
  const connected = onConnectedAccount();
  if (!connected) return run(undefined);

  try {
    return await run(connected);
  } catch (err) {
    if (!isMissingResource(err)) throw err;
    console.info(
      "[stripe] not on the connected account — retrying on the platform, " +
        "which is where anything from before Connect was configured lives",
    );
    return run(undefined);
  }
}

/** Stripe's "you asked about something that does not exist on this account". */
function isMissingResource(err: unknown): boolean {
  return (
    err instanceof Stripe.errors.StripeInvalidRequestError &&
    err.code === "resource_missing"
  );
}
