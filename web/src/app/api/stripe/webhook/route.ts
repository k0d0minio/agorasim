import type Stripe from "stripe";

import { closeUnpaidBooking, confirmPaidBooking } from "@/lib/booking-checkout";
import { listCatalogue } from "@/lib/experience-catalogue";
import { isStripeConfigured, isWebhookConfigured, stripe } from "@/lib/stripe";

/**
 * Stripe's webhook — the moment a booking becomes real.
 *
 * **This is the authority on payment.** The guest's browser being redirected
 * back to the site is a hint, not evidence: it can be closed, it can be faked,
 * and for a delayed method like Multibanco it happens days before the money
 * arrives. What confirms a booking is Stripe telling the server, signed.
 *
 * Four properties this route has to have, and how each is bought:
 *
 * 1. **Signature-verified.** The raw body is read as text and handed to
 *    `constructEventAsync` with the endpoint secret. Parsing the JSON first
 *    would change the bytes and break the signature — that is the classic way
 *    to build an endpoint anyone on the internet can confirm bookings through.
 * 2. **Fails closed.** No `STRIPE_WEBHOOK_SECRET`, no processing. An
 *    unverified endpoint that marks bookings paid is worse than no endpoint.
 * 3. **Idempotent.** Stripe retries anything it did not get a 2xx for, and the
 *    return page races this route to confirm the same booking. Both call
 *    `confirmPaidBooking`, whose update is guarded on `status = 'pending'`, so
 *    the second one through sends no second email.
 * 4. **Honest about failure.** A 500 asks Stripe to retry, which is right for a
 *    transient database error and wrong for an event we simply do not handle —
 *    those get a 200 and a shrug, or Stripe retries them for three days.
 */
export const dynamic = "force-dynamic";

/** Events that mean money arrived. */
const PAID_EVENTS = new Set<Stripe.Event["type"]>([
  "checkout.session.completed",
  // Multibanco and other delayed methods: `completed` fires when the guest
  // finishes the flow, this one when the money actually lands.
  "checkout.session.async_payment_succeeded",
]);

/** Events that mean it will never arrive. */
const FAILED_EVENTS = new Set<Stripe.Event["type"]>([
  "checkout.session.expired",
  "checkout.session.async_payment_failed",
]);

export async function POST(request: Request): Promise<Response> {
  if (!isStripeConfigured() || !isWebhookConfigured()) {
    console.error("[stripe] webhook received but Stripe is not configured — ignoring");
    return Response.json({ error: "not configured" }, { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) return Response.json({ error: "unsigned" }, { status: 400 });

  // Bytes as sent. `request.json()` would re-serialize and the signature would
  // never match again.
  const payload = await request.text();

  let event: Stripe.Event;
  try {
    event = await stripe().webhooks.constructEventAsync(
      payload,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  } catch (err) {
    // 400, not 500: the request is bad, and asking Stripe to retry a payload
    // that cannot be verified would just repeat the failure for three days.
    console.error("[stripe] rejected a webhook with a bad signature", err);
    return Response.json({ error: "bad signature" }, { status: 400 });
  }

  const session = event.data.object as Stripe.Checkout.Session;

  try {
    if (PAID_EVENTS.has(event.type)) {
      // `unpaid` happens on `completed` for delayed payment methods — the guest
      // has a reference to pay against, and nothing is confirmed until the
      // `async_payment_succeeded` event that follows.
      if (session.payment_status === "unpaid") {
        console.info(`[stripe] ${event.type} for ${session.id} is not paid yet — waiting`);
        return Response.json({ received: true, pending: true });
      }

      const catalogue = new Map(
        (await listCatalogue()).map((entry) => [entry.slug, entry]),
      );

      const outcome = await confirmPaidBooking({
        sessionId: session.id,
        paymentIntentId:
          typeof session.payment_intent === "string"
            ? session.payment_intent
            : (session.payment_intent?.id ?? null),
        catalogue,
      });

      if (outcome.status === "unknown-session") {
        // A payment with no booking behind it is the one thing here nobody can
        // fix automatically, so it is logged loudly rather than swallowed. 200
        // regardless: retrying will not conjure the row.
        console.error(
          `[stripe] paid session ${session.id} matches no booking — needs a human`,
        );
      }

      return Response.json({ received: true, outcome: outcome.status });
    }

    if (FAILED_EVENTS.has(event.type)) {
      await closeUnpaidBooking({
        sessionId: session.id,
        status: event.type === "checkout.session.expired" ? "expired" : "cancelled",
      });
      return Response.json({ received: true });
    }

    // Anything else Stripe is configured to send. Acknowledged, not retried.
    return Response.json({ received: true, ignored: event.type });
  } catch (err) {
    // Genuinely transient — a database blip. 500 asks Stripe to try again,
    // which is exactly what should happen.
    console.error(`[stripe] failed to handle ${event.type} for ${session.id}`, err);
    return Response.json({ error: "handler failed" }, { status: 500 });
  }
}
