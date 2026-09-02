import type Stripe from "stripe";

import { closeUnpaidBooking, confirmPaidBooking } from "@/lib/booking-checkout";
import { syncRefundFromStripe } from "@/lib/booking-refund";
import { listCatalogue } from "@/lib/experience-catalogue";
import {
  connectedAccountId,
  isStripeConfigured,
  isWebhookConfigured,
  onOwningAccount,
  stripe,
} from "@/lib/stripe";

/**
 * Stripe's webhook — the moment a booking becomes real.
 *
 * **This is the authority on payment.** The guest's browser being redirected
 * back to the site is a hint, not evidence: it can be closed, it can be faked,
 * and for a delayed method like Multibanco it happens days before the money
 * arrives. What confirms a booking is Stripe telling the server, signed.
 *
 * Five properties this route has to have, and how each is bought:
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
 * 5. **Account-aware.** Once checkouts run on the client's connected account
 *    (`lib/stripe.ts`), their events reach the platform through a Connect
 *    endpoint and carry `event.account`; the platform's own events carry
 *    nothing. Both are legitimate — bookings taken before Connect was
 *    configured still live on the platform — so the check is not that an
 *    account is present but that it is *ours*.
 *
 * The same five hold for money going the other way. `charge.refunded` is how a
 * refund issued in the Stripe dashboard — the way most of them will be, from a
 * phone, on a rained-off morning — reaches this side at all, and it is the only
 * way: nothing about it passes through this application. Handling it is what
 * frees the car, writes `refunded`, and returns the commission in proportion
 * (`lib/booking-refund.ts`); `refund.updated` follows the slower payment
 * methods, where a refund is requested now and settles or fails later.
 *
 * One endpoint serves both, and `STRIPE_WEBHOOK_SECRET` is whichever endpoint's
 * secret is in use: the Connect endpoint's once the connected account is live,
 * the platform endpoint's before that. Nothing here has to change to switch,
 * and no event this route acts on is read from anywhere but the signed payload
 * — the account only decides whether to act at all.
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

/** Events that mean some of it went back. */
const REFUND_EVENTS = new Set<Stripe.Event["type"]>([
  // The charge, after any refund lands on it — including one issued from the
  // Stripe dashboard, which is the only signal this application ever gets that
  // it happened.
  "charge.refunded",
  // A refund's own life: `pending` while a slower method settles it, then
  // `succeeded` or `failed`. The charge is re-read either way, so a refund that
  // fails is reconciled as honestly as one that lands.
  "refund.updated",
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

  /**
   * Whatever the event is about — a session, a charge, a refund — for the logs.
   * Not cast to one of those: this route now handles three shapes, and a cast
   * that is wrong for two of them is a lie waiting to be dereferenced.
   */
  const objectId = (event.data.object as { id?: string }).id ?? "(no id)";

  try {
    /**
     * Whose booking this is. An event from any account but our own connected
     * one is somebody else's payment arriving on a mis-wired endpoint: it is
     * acknowledged so Stripe stops retrying it, and dropped without touching
     * the database. Confirming a booking against a session id this deployment
     * never issued is precisely the hole the signature check exists to close,
     * and a shared platform account would otherwise reopen it.
     *
     * `null` means the platform's own account, which is where every booking
     * taken so far lives — so it is always accepted.
     */
    const eventAccount = event.account ?? null;
    if (eventAccount && eventAccount !== connectedAccountId()) {
      console.error(
        `[stripe] ${event.type} for ${objectId} came from ${eventAccount}, ` +
          "which is not this deployment's connected account — ignoring",
      );
      return Response.json({ received: true, ignored: "foreign account" });
    }

    if (PAID_EVENTS.has(event.type)) {
      const session = event.data.object as Stripe.Checkout.Session;
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
      const session = event.data.object as Stripe.Checkout.Session;
      await closeUnpaidBooking({
        sessionId: session.id,
        status: event.type === "checkout.session.expired" ? "expired" : "cancelled",
      });
      return Response.json({ received: true });
    }

    if (REFUND_EVENTS.has(event.type)) {
      const charge = await chargeBehind(event);
      if (!charge) {
        // A refund whose charge could not be read is not a database problem, so
        // a 500 would just have Stripe repeat it for three days. Logged inside
        // the helper; acknowledged here.
        return Response.json({ received: true, ignored: "no charge" });
      }

      const outcome = await syncRefundFromStripe({
        charge,
        // `refund.updated` names the refund; `charge.refunded` does not, and
        // `syncRefundFromStripe` goes looking.
        refundId:
          event.type === "refund.updated"
            ? (event.data.object as Stripe.Refund).id
            : null,
      });

      if (outcome.status === "unknown-charge") {
        // Money went back on a charge no booking here was paid with — the same
        // shape of problem as a paid session with no booking, and the same
        // answer: loud, and 200, because retrying will not conjure the row.
        console.error(
          `[stripe] ${charge.id} was refunded but matches no booking — needs a human`,
        );
      }

      return Response.json({ received: true, outcome: outcome.status });
    }

    // Anything else Stripe is configured to send. Acknowledged, not retried.
    return Response.json({ received: true, ignored: event.type });
  } catch (err) {
    // Genuinely transient — a database blip. 500 asks Stripe to try again,
    // which is exactly what should happen.
    console.error(`[stripe] failed to handle ${event.type} for ${objectId}`, err);
    return Response.json({ error: "handler failed" }, { status: 500 });
  }
}

/**
 * The charge a refund event is about, as Stripe currently has it.
 *
 * Both refund events are reconciled from the *charge*, never from the refund:
 * `charge.amount_refunded` is cumulative and absolute, so a booking set to it
 * converges on the truth however many events arrive, in whatever order, and a
 * refund that later fails lowers it again. Adding up refunds instead would
 * double-count the first redelivery.
 *
 * `charge.refunded` already carries that object, so it costs nothing.
 * `refund.updated` carries only the refund, so the charge is fetched — on
 * whichever account owns it, which for a booking taken before Connect was
 * configured is the platform (`lib/stripe.ts`).
 *
 * `null` on anything unreadable, which the caller acknowledges rather than
 * retries: an event about a charge that cannot be fetched will not become
 * fetchable in three days of Stripe trying again.
 */
async function chargeBehind(event: Stripe.Event): Promise<Stripe.Charge | null> {
  if (event.type === "charge.refunded") return event.data.object as Stripe.Charge;

  const refund = event.data.object as Stripe.Refund;
  const chargeId =
    typeof refund.charge === "string" ? refund.charge : (refund.charge?.id ?? null);

  if (!chargeId) {
    console.error(`[stripe] ${refund.id} names no charge — nothing to reconcile`);
    return null;
  }

  try {
    return await onOwningAccount((account) =>
      // Expanded, so the refund id on the row can come from the charge itself
      // rather than a second call for the events that carry no refund.
      stripe().charges.retrieve(chargeId, { expand: ["refunds"] }, account),
    );
  } catch (err) {
    console.error(`[stripe] couldn't read ${chargeId} behind refund ${refund.id}`, err);
    return null;
  }
}
