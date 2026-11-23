/**
 * The payment link: a tour the team registered on a lead, paid by the
 * customer on a page of ours, and confirmed only when the money lands.
 *
 * **Nothing is held until the customer pays.** "Dates are not held without
 * payment" (Diogo, 2026-10-12). The booking is a `pending` row whose hold has
 * already lapsed (`hold_expires_at = now` at creation), so it counts against no
 * car. A tap on "Pagar" re-runs the departure's capacity check, and only then
 * holds a car for the hold of a checkout (`BOOKING_HOLD_MINUTES`), exactly as
 * `/reservar` does. A departure that filled in the meantime is refused on the page, before
 * any money moves.
 *
 * **A link booking is marked by its credential.** `payment_link_token_hash` is
 * set on these rows and on no other, and it is what tells the expiry paths to
 * leave them `pending` until the departure is past ({@link awaitsLinkPayment}).
 * The plaintext lives only in the emailed link, as with the cancel link
 * (`lib/cancellation-token.ts`, whose HMAC this reuses). A resend mints a new
 * token, so the old link stops working.
 *
 * **Payment confirms through the normal path.** The session carries the
 * booking's id like any checkout, so the Stripe webhook and the return page
 * (`/reservar/confirmacao`) confirm it with `confirmPaidBooking`: the car is
 * kept, both confirmation emails go out, the commission is read back, and the
 * lead moves to "Reservado".
 */
import "server-only";

import { and, eq, isNotNull, isNull, lte } from "drizzle-orm";
import type Stripe from "stripe";

import { bookings, db, tourRequests, type Booking, type TourRequest } from "@/db";
import type { Locale, Localized } from "@/i18n/config";
import { recordAuditOrWarn } from "@/lib/audit";
import { checkSlotAvailable, formatDay, todayKey } from "@/lib/availability";
import { withDepartureLock } from "@/lib/departure-lock";
import {
  bookingLogisticsFacts,
  guestPaymentLinkEmail,
  titleFromCatalogue,
} from "@/lib/booking-emails";
import {
  awaitsLinkPayment,
  bookingRef,
  checkoutSessionExpiryFrom,
  holdExpiryFrom,
  slotOccupancyOn,
} from "@/lib/bookings";
import {
  cancellationTokenDigest,
  isCancellationTokenConfigured,
  issueCancellationToken,
  looksLikeCancellationToken,
} from "@/lib/cancellation-token";
import { commissionOn } from "@/lib/commission";
import { listCatalogue } from "@/lib/experience-catalogue";
import { sendLoggedEmail } from "@/lib/message-log";
import { formatPrice } from "@/lib/money";
import { siteUrl } from "@/lib/site-origin";
import {
  connectedAccountId,
  isStripeConfigured,
  onConnectedAccount,
  onOwningAccount,
  stripe,
} from "@/lib/stripe";

/**
 * Where a payment link points: `/<locale>/reservar/pagar/<token>`.
 *
 * Under `/reservar` on purpose: that tree is already a payment route, so the
 * policy that admits Stripe's embedded form covers it (`lib/payment-route.ts`).
 */
export function paymentLinkPath(locale: string, token: string): string {
  return `/${locale}/reservar/pagar/${token}`;
}

/** Whether links can be minted at all on this deployment. */
export function isPaymentLinkConfigured(): boolean {
  return isCancellationTokenConfigured() && isStripeConfigured();
}

export type PaymentLinkSendOutcome =
  | { status: "sent" }
  /** The link is live, but the email did not go: "Reenviar link" fixes it. */
  | { status: "email-failed" }
  | { status: "not-found" }
  /** Paid, cancelled or expired — there is nothing left to pay. */
  | { status: "not-pending" }
  | { status: "unconfigured" };

/**
 * Mint a new link for a link booking and email it to the customer.
 *
 * Every call rotates the token: the digest is replaced under a guard on
 * `status = 'pending'`, and `payment_link_sent_at` is stamped with it. The
 * stamp names the link in `message_log`, so this send is one email and a
 * second call is a second email with a new link — never a refused duplicate.
 *
 * The rotation comes first and the email second. If the email then fails, the
 * old link is dead and the new one is in no inbox: the outcome says so, and a
 * second call is the fix.
 */
export async function sendPaymentLink(options: {
  bookingId: string;
  actorUserId: string | null;
  resend: boolean;
}): Promise<PaymentLinkSendOutcome> {
  if (!isCancellationTokenConfigured()) return { status: "unconfigured" };

  const now = new Date();
  const issued = await issueCancellationToken();
  const [booking] = await db
    .update(bookings)
    .set({
      paymentLinkTokenHash: issued.digest,
      paymentLinkSentAt: now,
      updatedAt: now,
    })
    .where(
      and(
        eq(bookings.id, options.bookingId),
        eq(bookings.status, "pending"),
        // Only a link booking: a public checkout waiting on its own form is
        // not turned into one by a crafted post.
        isNotNull(bookings.paymentLinkTokenHash),
      ),
    )
    .returning();

  if (!booking) {
    const [existing] = await db
      .select({ id: bookings.id })
      .from(bookings)
      .where(eq(bookings.id, options.bookingId))
      .limit(1);
    return { status: existing ? "not-pending" : "not-found" };
  }

  const lead = booking.tourRequestId ? await readLead(booking.tourRequestId) : null;
  if (!lead?.email) return { status: "email-failed" };

  const catalogue = new Map((await listCatalogue()).map((entry) => [entry.slug, entry]));
  const locale = booking.locale;
  const message = guestPaymentLinkEmail({
    ref: bookingRef(booking.id),
    guestName: lead.name,
    guestEmail: lead.email,
    locale,
    date: formatDay(booking.date, locale),
    ...bookingLogisticsFacts(booking, titleFromCatalogue(catalogue), locale),
    total: formatPrice(booking.amountCents, locale, booking.currency),
    payUrl: `${siteUrl()}${paymentLinkPath(locale, issued.token)}`,
  });

  const result = await sendLoggedEmail(
    {
      kind: "booking-payment-link",
      recipient: "guest",
      bookingId: booking.id,
      tourRequestId: lead.id,
      linkSentAt: now,
    },
    message,
  );

  await recordAuditOrWarn({
    actorUserId: options.actorUserId,
    action: "booking.payment_link_sent",
    entityType: "booking",
    entityId: booking.id,
    // The ref and the send, never the token: it is a credential.
    after: { ref: bookingRef(booking.id), resend: options.resend, email: result.status },
  });

  if (result.status === "sent" || result.status === "duplicate") return { status: "sent" };
  console.error(
    `[payment-link] ${bookingRef(booking.id)}: the link email was not sent (${result.status})`,
  );
  return { status: "email-failed" };
}

/** The lead a link booking belongs to — the person the email goes to. */
async function readLead(id: string): Promise<TourRequest | null> {
  const [lead] = await db.select().from(tourRequests).where(eq(tourRequests.id, id)).limit(1);
  return lead ?? null;
}

/**
 * The booking a link token opens, with its lead, or `null` for a token that is
 * malformed, unknown or replaced by a resend. The caller says nothing about
 * which of those it was.
 */
export async function resolvePaymentLink(
  token: string,
): Promise<{ booking: Booking; lead: TourRequest | null } | null> {
  if (!looksLikeCancellationToken(token) || !isCancellationTokenConfigured()) return null;

  const digest = await cancellationTokenDigest(token);
  const [booking] = await db
    .select()
    .from(bookings)
    .where(eq(bookings.paymentLinkTokenHash, digest))
    .limit(1);
  if (!booking) return null;

  const lead = booking.tourRequestId ? await readLead(booking.tourRequestId) : null;
  return { booking, lead };
}

/** What the payment page can be in, before any tap. */
export type PaymentLinkState = "payable" | "paid" | "closed";

/**
 * The page's state for a resolved booking. `closed` covers a booking the team
 * cancelled, one that expired, and one whose departure is past.
 */
export function paymentLinkState(
  booking: Pick<Booking, "status" | "paymentLinkTokenHash" | "date">,
  now: Date = new Date(),
): PaymentLinkState {
  if (booking.status === "confirmed" || booking.status === "refunded") return "paid";
  if (!awaitsLinkPayment(booking)) return "closed";
  return booking.date < todayKey(now) ? "closed" : "payable";
}

export type PaymentLinkCheckoutOutcome =
  | { status: "embedded"; clientSecret: string; stripeAccount: string | null }
  /** Paid already — or a moment ago, and the confirmation is on its way. */
  | { status: "paid" }
  /** Paid by a delayed method (Multibanco), not settled yet. */
  | { status: "awaiting" }
  /** Cancelled by the team, expired, or the departure is past. */
  | { status: "closed" }
  /** The departure has no room for this party any more. */
  | { status: "full" }
  | { status: "not-found" }
  | { status: "unconfigured" }
  | { status: "failed" };

/**
 * The customer tapped "Pagar": check the departure again, hold the car for the
 * length of one Stripe session, and open Stripe's form.
 *
 * **An earlier tap is reused, not repeated.** A session that is still open
 * under a live hold is handed back as it is, so two taps never hold two cars.
 * A session that completed is never replaced: a delayed method (Multibanco)
 * completes unpaid and settles days later against that session's id, and a
 * new session would leave that payment matching no booking.
 */
export async function startPaymentLinkCheckout(options: {
  token: string;
  locale: Locale;
}): Promise<PaymentLinkCheckoutOutcome> {
  const { token, locale } = options;
  if (!isStripeConfigured()) return { status: "unconfigured" };

  const found = await resolvePaymentLink(token);
  if (!found) return { status: "not-found" };
  const { booking, lead } = found;

  const now = new Date();
  const state = paymentLinkState(booking, now);
  if (state !== "payable") return { status: state };

  if (booking.stripeSessionId) {
    const sessionId = booking.stripeSessionId;
    let session: Stripe.Checkout.Session;
    try {
      session = await onOwningAccount((requestOptions) =>
        stripe().checkout.sessions.retrieve(sessionId, {}, requestOptions),
      );
    } catch (err) {
      // Unknown is not "expired": minting a second session over a payment
      // that may be in flight is the one mistake this path must not make.
      console.error(
        `[payment-link] couldn't read ${sessionId} for ${bookingRef(booking.id)}`,
        err,
      );
      return { status: "failed" };
    }

    if (session.status === "complete") {
      return { status: session.payment_status === "unpaid" ? "awaiting" : "paid" };
    }
    if (
      session.status === "open" &&
      session.client_secret &&
      booking.holdExpiresAt.getTime() > now.getTime()
    ) {
      return {
        status: "embedded",
        clientSecret: session.client_secret,
        stripeAccount: connectedAccountId(),
      };
    }
    if (session.status === "open") {
      // Open past its hold: close it, so it cannot be paid for a car that is
      // no longer held. A new session replaces it below.
      await onOwningAccount((requestOptions) =>
        stripe().checkout.sessions.expire(sessionId, {}, requestOptions),
      ).catch((err) => {
        console.error(`[payment-link] couldn't expire ${sessionId}`, err);
      });
    }
  }

  /*
    The re-check and the hold, under the departure's lock
    (`lib/departure-lock.ts`): a guest paying for the last seat at
    `/reservar` in the same second waits for this hold, then reads it.
  */
  const holdExpiresAt = holdExpiryFrom(now);
  type Claim = { status: "held"; held: Booking } | { status: "full" | "failed" };
  let claim: Claim;
  try {
    claim = await withDepartureLock<Claim>(booking.date, booking.slot, async () => {
      const fit = await checkSlotAvailable({
        experienceSlug: booking.experienceSlug,
        date: booking.date,
        slot: booking.slot,
        partySize: booking.partySize,
        mode: booking.mode,
        occupancy: await slotOccupancyOn(booking.date, booking.slot, now),
        // The team sold this departure: the notice and the six-month window were
        // theirs to waive. Capacity still binds, as at "Registar reserva".
        audience: "team",
      });
      if (!fit.ok) return { status: fit.reason === "unreadable" ? "failed" : "full" };

      // The hold, claimed under a guard: only a row with no live hold takes one,
      // so a second tap racing this one finds nothing to claim.
      const [held] = await db
        .update(bookings)
        .set({
          holdExpiresAt,
          vehicleClass: fit.vehicleClass,
          sharedCarId: fit.sharedCarId,
          stripeSessionId: null,
          updatedAt: now,
        })
        .where(
          and(
            eq(bookings.id, booking.id),
            eq(bookings.status, "pending"),
            lte(bookings.holdExpiresAt, now),
          ),
        )
        .returning();
      return held ? { status: "held", held } : { status: "failed" };
    });
  } catch (err) {
    console.error(
      `[payment-link] couldn't hold the departure for ${bookingRef(booking.id)}`,
      err,
    );
    return { status: "failed" };
  }
  if (claim.status !== "held") return { status: claim.status };
  const { held } = claim;

  const catalogue = new Map((await listCatalogue()).map((entry) => [entry.slug, entry]));
  const facts = bookingLogisticsFacts(held, titleFromCatalogue(catalogue), locale);
  const applicationFeeCents = connectedAccountId()
    ? commissionOn("tour", held.amountCents).feeCents
    : null;

  try {
    const session = await stripe().checkout.sessions.create(
      {
        mode: "payment",
        ui_mode: "embedded_page",
        // One line for the whole booking. The breakdown can carry an agreed
        // discount as a negative line, which Stripe does not take; the page
        // above the form shows the detail.
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: held.currency,
              unit_amount: held.amountCents,
              product_data: {
                name: `${facts.experience} — ${formatDay(held.date, locale)}`,
                description: `${facts.departure} · ${facts.partyLabel}`,
              },
            },
          },
        ],
        customer_email: lead?.email ?? undefined,
        client_reference_id: held.id,
        metadata: {
          bookingId: held.id,
          date: held.date,
          slot: held.slot,
          mode: held.mode,
          partySize: String(held.partySize),
          vehicleClass: held.vehicleClass,
          paymentLink: "1",
        },
        payment_intent_data: {
          metadata: { bookingId: held.id, date: held.date, ref: bookingRef(held.id) },
          ...(applicationFeeCents !== null
            ? { application_fee_amount: applicationFeeCents }
            : {}),
        },
        // Stripe's shortest expiry, which outlives the hold, as at `/reservar`
        // (`CHECKOUT_SESSION_MINUTES` in `lib/bookings.ts`).
        expires_at: Math.floor(checkoutSessionExpiryFrom(now).getTime() / 1000),
        locale: locale === "pt" ? "pt" : "en",
        redirect_on_completion: "always",
        return_url: `${siteUrl()}/${locale}/reservar/confirmacao?session_id={CHECKOUT_SESSION_ID}`,
      },
      onConnectedAccount(),
    );
    if (!session.client_secret) {
      throw new Error("Stripe returned an embedded session with no client secret");
    }

    await db
      .update(bookings)
      .set({ stripeSessionId: session.id, updatedAt: new Date() })
      .where(eq(bookings.id, held.id));

    return {
      status: "embedded",
      clientSecret: session.client_secret,
      stripeAccount: connectedAccountId(),
    };
  } catch (err) {
    console.error(`[payment-link] could not start a session for ${bookingRef(held.id)}`, err);
    // Give the car back now rather than when the hold lapses.
    await db
      .update(bookings)
      .set({ holdExpiresAt: new Date(), updatedAt: new Date() })
      .where(
        and(
          eq(bookings.id, held.id),
          eq(bookings.status, "pending"),
          isNull(bookings.stripeSessionId),
        ),
      )
      .catch(() => undefined);
    return { status: "failed" };
  }
}

export type VoidPaymentLinkOutcome =
  | { status: "cancelled"; booking: Booking }
  | { status: "not-found" }
  /** Paid, cancelled or expired already. */
  | { status: "not-pending" }
  /** A delayed payment (Multibanco) is in flight on the link. */
  | { status: "in-payment" };

/**
 * "Anular link": the team calls off an unpaid link booking.
 *
 * The booking becomes `cancelled` by `admin`. The token stays on the row, so
 * the customer who taps the link reads that the booking was cancelled rather
 * than "unknown link". An open Stripe session is expired first, so nothing can
 * be paid after this returns. A delayed payment already under way is not
 * cancelled from here: the money is moving, and the outcome says so.
 */
export async function voidPaymentLink(options: {
  bookingId: string;
  actorUserId: string;
}): Promise<VoidPaymentLinkOutcome> {
  const [booking] = await db
    .select()
    .from(bookings)
    .where(eq(bookings.id, options.bookingId))
    .limit(1);
  if (!booking) return { status: "not-found" };
  if (!awaitsLinkPayment(booking)) return { status: "not-pending" };

  if (booking.stripeSessionId && isStripeConfigured()) {
    const sessionId = booking.stripeSessionId;
    const session = await onOwningAccount((requestOptions) =>
      stripe().checkout.sessions.retrieve(sessionId, {}, requestOptions),
    );
    if (session.status === "complete") return { status: "in-payment" };
    if (session.status === "open") {
      await onOwningAccount((requestOptions) =>
        stripe().checkout.sessions.expire(sessionId, {}, requestOptions),
      );
    }
  }

  const now = new Date();
  const [cancelled] = await db
    .update(bookings)
    .set({
      status: "cancelled",
      cancelledAt: now,
      cancelledVia: "admin",
      holdExpiresAt: now,
      updatedAt: now,
    })
    .where(and(eq(bookings.id, booking.id), eq(bookings.status, "pending")))
    .returning();
  if (!cancelled) return { status: "not-pending" };

  await recordAuditOrWarn({
    actorUserId: options.actorUserId,
    action: "booking.cancelled",
    entityType: "booking",
    entityId: cancelled.id,
    before: { status: booking.status },
    after: { ref: bookingRef(cancelled.id), status: "cancelled", paymentLink: true },
  });

  return { status: "cancelled", booking: cancelled };
}

/** The payment page's facts, in the customer's language. */
export function paymentLinkSummary(
  booking: Booking,
  catalogue: ReadonlyMap<string, { title: Localized }>,
  locale: Locale,
) {
  const facts = bookingLogisticsFacts(booking, titleFromCatalogue(catalogue), locale);
  return {
    ref: bookingRef(booking.id),
    experience: facts.experience,
    date: formatDay(booking.date, locale),
    departure: facts.departure,
    party: facts.partyLabel,
    addOns: facts.addOns,
    total: formatPrice(booking.amountCents, locale, booking.currency),
  };
}

export type PaymentLinkSummary = ReturnType<typeof paymentLinkSummary>;

/** The title lookup over the live catalogue — the page's one catalogue read. */
export async function catalogueTitles(): Promise<Map<string, { title: Localized }>> {
  return new Map((await listCatalogue()).map((entry) => [entry.slug, entry]));
}
