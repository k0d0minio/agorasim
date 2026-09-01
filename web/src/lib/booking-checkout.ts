/**
 * The paid-booking loop: hold a car, send the guest to Stripe, and confirm
 * when the money actually arrives.
 *
 * **Confirmation is idempotent, and that is the whole design.** Two things race
 * to confirm every booking — Stripe's webhook and the guest landing back on the
 * confirmation page — and Stripe itself retries webhooks it thinks failed. Both
 * paths call {@link confirmPaidBooking}, whose update is guarded by
 * `status = 'pending'`, so exactly one caller ever wins and exactly one set of
 * emails goes out. The webhook is the authority; the return page is the safety
 * net for a webhook that is late, misconfigured, or being demonstrated on a
 * phone.
 *
 * **The car is held before the guest leaves.** A `pending` booking row is
 * written first, then the Stripe session; the hold and the session are given
 * the same 30-minute deadline, so a guest who wanders off releases the driver
 * and the car by the clock (see `lib/bookings.ts`) rather than by a job that
 * has to run.
 *
 * **Every booking is born with a credential.** The row carries a hashed
 * cancellation token from the insert (`lib/cancellation-token.ts`), because the
 * table holds no guest identity to authenticate against — the token in the
 * emailed link is the only thing that will prove a booking is somebody's. There
 * is no route reading it yet.
 *
 * **The guest is a lead from the first click.** The `tour_requests` row is
 * written up front, not on payment: an abandoned checkout is a person who
 * wanted this tour on this day and got as far as their card, which is the best
 * lead the site produces. It sits in "New" on the Sales board like any other,
 * and becomes "Booked" when the payment lands.
 */
import "server-only";

import { and, eq } from "drizzle-orm";

import {
  bookings,
  db,
  tourRequests,
  type AvailabilitySlot,
  type Booking,
} from "@/db";
import { MARKETING_CONSENT_VERSION } from "@/content/privacy";
import { bookingContent } from "@/content/booking";
import { bookingEmails } from "@/content/emails";
import {
  departureLabel,
  departureTimeFollowsByEmail,
  meetingPoints,
} from "@/content/logistics";
import { t, type Locale } from "@/i18n/config";
import type { Experience } from "@/content/experiences";
import { formatDay, type DateKey } from "@/lib/availability";
import { bookingRef, holdExpiryFrom } from "@/lib/bookings";
import {
  isCancellationTokenConfigured,
  issueCancellationToken,
} from "@/lib/cancellation-token";
import { CANCEL_RETURN_PARAM, CANCEL_RETURN_VALUE } from "@/lib/checkout-draft";
import { BOOKING_CURRENCY, formatPrice } from "@/lib/money";
import type { VehicleClass } from "@/lib/fleet";
import type { BookingMode, PartyCount, PricedLine } from "@/lib/pricing";
import {
  guestConfirmationEmail,
  partyLabel,
  teamNotificationEmail,
} from "@/lib/booking-emails";
import { isEmailConfigured, sendEmail, teamRecipients } from "@/lib/email";
import { recordAuditOrWarn } from "@/lib/audit";
import { siteUrl } from "@/lib/site-origin";
import { stripe } from "@/lib/stripe";

/**
 * Start a checkout: the lead, the hold, and the Stripe session.
 *
 * Returns the URL to send the guest to. Throws only for genuinely unexpected
 * failures — the expected ones (day gone, nothing priced) are decided by the
 * caller before it gets here.
 */
export async function startBookingCheckout(options: {
  guest: {
    name: string;
    email: string;
    phone: string | null;
    message: string | null;
    marketingConsent: boolean;
  };
  locale: Locale;
  date: DateKey;
  slot: AvailabilitySlot;
  mode: BookingMode;
  party: PartyCount;
  /**
   * Which class of car this booking takes out of the pool, as decided by the
   * availability re-check that just ran. Passed in rather than recomputed here:
   * the car that was checked as free is the car that must be committed, and a
   * second call to the rule is a second chance for the two to disagree.
   */
  vehicleClass: VehicleClass;
  experience: Experience;
  addOns: Experience[];
  lines: PricedLine[];
  totalCents: number;
}): Promise<{ url: string; bookingId: string }> {
  const {
    guest,
    locale,
    date,
    slot,
    mode,
    party,
    vehicleClass,
    experience,
    addOns,
    lines,
    totalCents,
  } = options;

  const partySize = party.adults + party.children + party.infants;
  const now = new Date();
  const holdExpiresAt = holdExpiryFrom(now);

  /**
   * The booking's own credential, hashed onto the row from the moment it
   * exists — so no booking is ever tokenless and the cancel route has exactly
   * one question to ask of a link.
   *
   * The plaintext is deliberately dropped here rather than returned: the guest
   * is about to be sent to Stripe, and the confirmation email that will
   * eventually carry the link is composed in another request entirely (see
   * {@link confirmPaidBooking}), which cannot recover a plaintext from a hash.
   * Issuing the link the guest actually receives therefore belongs to that
   * path, and re-issuing there replaces this digest.
   *
   * A missing `BOOKING_TOKEN_SECRET` must not cost a sale. It is logged and the
   * column is left null, which every reader treats as "no self-serve
   * cancellation, talk to the team" — the safe direction to fail in.
   */
  let cancellationTokenHash: string | null = null;
  if (isCancellationTokenConfigured()) {
    cancellationTokenHash = (await issueCancellationToken()).digest;
  } else {
    console.error(
      "[booking] BOOKING_TOKEN_SECRET is not set — this booking gets no cancel link",
    );
  }

  const [lead] = await db
    .insert(tourRequests)
    .values({
      name: guest.name,
      email: guest.email,
      phone: guest.phone,
      locale,
      kind: "tour",
      experienceSlug: experience.slug,
      addOns: addOns.map((entry) => entry.slug),
      partySize,
      preferredDate: date,
      message: guest.message,
      // "New", not "Booked": nothing has been paid yet. The webhook moves it.
      status: "new",
      // Distinguishes a checkout from a plain enquiry on the Sales board, and
      // is what makes "how many people started paying?" answerable.
      source: "booking",
      marketingConsent: guest.marketingConsent,
      marketingConsentAt: guest.marketingConsent ? now : null,
      marketingConsentVersion: guest.marketingConsent ? MARKETING_CONSENT_VERSION : null,
    })
    .returning({ id: tourRequests.id });

  const [booking] = await db
    .insert(bookings)
    .values({
      tourRequestId: lead.id,
      date,
      slot,
      mode,
      adults: party.adults,
      children: party.children,
      infants: party.infants,
      // One driver and one car of this class, out of the departure's shared
      // pool — see the occupancy rule in lib/bookings.ts.
      vehicleClass,
      experienceSlug: experience.slug,
      addOns: addOns.map((entry) => entry.slug),
      partySize,
      amountCents: totalCents,
      currency: BOOKING_CURRENCY,
      priceBreakdown: lines,
      locale,
      holdExpiresAt,
      cancellationTokenHash,
    })
    .returning({ id: bookings.id });

  const base = siteUrl();
  const byslug = new Map<string, Experience>(
    [experience, ...addOns].map((entry) => [entry.slug, entry]),
  );

  /**
   * What one priced line is called on Stripe's payment page. The slug names
   * the experience; `unit` says which band of the price list the line is —
   * and the guest sees exactly the split the summary card showed them.
   */
  const lineName = (line: PricedLine): string => {
    const title = t(byslug.get(line.slug)!.title, locale);
    if (line.unit === "group") return `${title} — ${t(bookingContent.labels.privateGroup, locale)}`;
    if (line.unit === "child") return `${title} — ${t(bookingContent.labels.childrenLine, locale)}`;
    return title;
  };

  try {
    const session = await stripe().checkout.sessions.create({
      mode: "payment",
      // Payment methods come from the Stripe dashboard rather than being listed
      // here, so enabling MB WAY or Multibanco — which Portuguese guests will
      // expect — is a switch the team can flip without a deploy.
      line_items: lines.map((line) => ({
        quantity: line.quantity,
        price_data: {
          currency: BOOKING_CURRENCY,
          unit_amount: line.unitCents,
          product_data: {
            name: lineName(line),
            description:
              line.unit === "child"
                ? undefined
                : t(byslug.get(line.slug)!.tagline, locale) || undefined,
          },
        },
      })),
      customer_email: guest.email,
      client_reference_id: booking.id,
      // On the session and on the payment intent: the first is what the webhook
      // reads, the second is what a refund in the Stripe dashboard shows the
      // person issuing it.
      metadata: {
        bookingId: booking.id,
        date,
        slot,
        mode,
        partySize: String(partySize),
        vehicleClass,
      },
      payment_intent_data: {
        metadata: { bookingId: booking.id, date, ref: bookingRef(booking.id) },
      },
      // The same instant the hold lapses, so the two cannot disagree about
      // whether paying is still possible.
      expires_at: Math.floor(holdExpiresAt.getTime() / 1000),
      locale: locale === "pt" ? "pt" : "en",
      success_url: `${base}/${locale}/reservar/confirmacao?session_id={CHECKOUT_SESSION_ID}`,
      // Back to the form, not to an error: a guest who changed their mind about
      // the card has not changed their mind about the tour.
      //
      // The flag is what tells the form this is a return rather than a fresh
      // visit, so it puts their basket back from the draft their own browser
      // kept (`lib/checkout-draft.ts`). Deliberately the *only* thing on this
      // URL: a `cancel_url` carrying their name, email and party would put all
      // of it into browser history, proxy logs and the next page's referrer.
      cancel_url: `${base}/${locale}/reservar?${CANCEL_RETURN_PARAM}=${CANCEL_RETURN_VALUE}`,
    });

    if (!session.url) throw new Error("Stripe returned a session with no URL");

    await db
      .update(bookings)
      .set({ stripeSessionId: session.id, updatedAt: new Date() })
      .where(eq(bookings.id, booking.id));

    return { url: session.url, bookingId: booking.id };
  } catch (err) {
    // The hold would lapse on its own in half an hour, but a car held for a
    // checkout that never started is a car nobody can book for no reason.
    await db
      .update(bookings)
      .set({
        status: "cancelled",
        cancelledAt: new Date(),
        // Nobody called this off — Stripe did, by not giving us a session.
        cancelledVia: "system",
        updatedAt: new Date(),
      })
      .where(eq(bookings.id, booking.id))
      .catch(() => undefined);
    throw err;
  }
}

export type ConfirmationOutcome =
  | { status: "confirmed"; booking: Booking; alreadyConfirmed: false }
  | { status: "confirmed"; booking: Booking; alreadyConfirmed: true }
  | { status: "unknown-session" }
  | { status: "not-payable"; booking: Booking };

/**
 * Mark a booking paid, move its lead to "Booked", and send the two emails.
 *
 * Called by the Stripe webhook and by the page the guest lands on afterwards.
 * The `status = 'pending'` guard on the update is what makes that safe: the
 * second caller finds nothing to update, learns the booking is already
 * confirmed, and returns without sending a second confirmation email.
 *
 * Emails are best-effort by design. The money has been taken and the booking is
 * recorded; failing this call because a mail server was slow would make Stripe
 * retry a webhook that already succeeded.
 */
export async function confirmPaidBooking(options: {
  sessionId: string;
  paymentIntentId?: string | null;
  /** Resolves experience slugs to names for the emails. */
  catalogue: Map<string, Experience>;
  /**
   * The locale of the path the guest is standing on as this runs — `pt` for
   * `/pt/reservar/confirmacao`, `en` for `/en/…`.
   *
   * The booking already carries the language it was made in, and the two agree
   * in the ordinary case because Stripe returns the guest to a `success_url`
   * built from that same locale. This is what settles the case where they do
   * not: the confirmation the guest is reading *right now*, in the language
   * they are reading it in, is the better evidence of which language to write
   * to them in, so it wins and is written back to the booking.
   *
   * Omitted by the Stripe webhook, which has no path — it confirms from the
   * language recorded at checkout.
   */
  pathLocale?: Locale;
}): Promise<ConfirmationOutcome> {
  const { sessionId, paymentIntentId, catalogue, pathLocale } = options;
  const now = new Date();

  const [existing] = await db
    .select()
    .from(bookings)
    .where(eq(bookings.stripeSessionId, sessionId))
    .limit(1);

  if (!existing) return { status: "unknown-session" };
  if (existing.status === "confirmed") {
    return { status: "confirmed", booking: existing, alreadyConfirmed: true };
  }
  if (existing.status !== "pending") {
    // Expired or cancelled and then paid anyway — possible with a delayed
    // payment method. Left alone deliberately: the car may have been resold,
    // and quietly confirming it could double-book it. It surfaces as a
    // payment with no confirmed booking, which is a phone call, not a silent
    // overbooking.
    console.error(
      `[booking] ${bookingRef(existing.id)} was paid but is ${existing.status} — needs a human`,
    );
    return { status: "not-payable", booking: existing };
  }

  const [confirmed] = await db
    .update(bookings)
    .set({
      status: "confirmed",
      confirmedAt: now,
      stripePaymentIntentId: paymentIntentId ?? existing.stripePaymentIntentId,
      // Persisted, not just used for the mail: the Sales board, the admin's
      // "write to this guest" templates and this page all have to agree about
      // which language this person reads.
      ...(pathLocale && pathLocale !== existing.locale ? { locale: pathLocale } : {}),
      updatedAt: now,
    })
    // The guard. Two callers race here; exactly one row comes back.
    .where(and(eq(bookings.id, existing.id), eq(bookings.status, "pending")))
    .returning();

  if (!confirmed) {
    const [after] = await db
      .select()
      .from(bookings)
      .where(eq(bookings.id, existing.id))
      .limit(1);
    return { status: "confirmed", booking: after ?? existing, alreadyConfirmed: true };
  }

  let lead: typeof tourRequests.$inferSelect | undefined;
  if (confirmed.tourRequestId) {
    [lead] = await db
      .update(tourRequests)
      .set({
        status: "booked",
        ...(pathLocale && pathLocale !== existing.locale ? { locale: pathLocale } : {}),
        updatedAt: now,
      })
      .where(eq(tourRequests.id, confirmed.tourRequestId))
      .returning();
  }

  await recordAuditOrWarn({
    // Nobody pressed anything — the actor is Stripe. Same shape the retention
    // job uses for the same reason.
    actorUserId: null,
    action: "booking.confirmed",
    entityType: "booking",
    entityId: confirmed.id,
    after: {
      ref: bookingRef(confirmed.id),
      date: confirmed.date,
      partySize: confirmed.partySize,
      amountCents: confirmed.amountCents,
    },
    ipAddress: null,
  });

  await sendConfirmationEmails(confirmed, lead, catalogue);

  return { status: "confirmed", booking: confirmed, alreadyConfirmed: false };
}

/** Both confirmation emails. Never throws — see the module note. */
async function sendConfirmationEmails(
  booking: Booking,
  lead: typeof tourRequests.$inferSelect | undefined,
  catalogue: Map<string, Experience>,
): Promise<void> {
  if (!lead) {
    console.warn(
      `[booking] ${bookingRef(booking.id)} has no lead row — no confirmation sent`,
    );
    return;
  }
  if (!isEmailConfigured()) return;

  const locale = booking.locale;
  const name = (slug: string) => {
    const entry = catalogue.get(slug);
    // A retired add-on still has to be nameable in the email of the guest who
    // bought it; the slug is a poor name but it is never a blank line.
    return entry ? t(entry.title, locale) : slug;
  };

  const facts = {
    ref: bookingRef(booking.id),
    guestName: lead.name,
    guestEmail: lead.email,
    guestPhone: lead.phone,
    locale,
    date: formatDay(booking.date, locale),
    experience: `${name(booking.experienceSlug)} — ${t(bookingEmails.guest.modeWords[booking.mode], locale)}`,
    departure: t(departureLabel(booking.experienceSlug, booking.slot), locale),
    departureTimeFollows: departureTimeFollowsByEmail(booking.experienceSlug),
    meetingPoint: meetingPoints[booking.experienceSlug] ?? null,
    addOns: booking.addOns.map(name),
    partySize: booking.partySize,
    partyLabel: partyLabel(booking, locale),
    total: formatPrice(booking.amountCents, locale, booking.currency),
    adminUrl: `${siteUrl()}/admin/sales/${lead.id}`,
  };

  const team = teamRecipients();
  const results = await Promise.all([
    sendEmail(guestConfirmationEmail(facts)),
    team.length > 0
      ? sendEmail(teamNotificationEmail(facts, team))
      : Promise.resolve({ sent: false as const, reason: "no-recipient" as const }),
  ]);

  for (const [who, result] of [["guest", results[0]], ["team", results[1]]] as const) {
    if (!result.sent) {
      console.error(
        `[booking] ${facts.ref} confirmed but the ${who} email was not sent (${result.reason})`,
      );
    }
  }
}

/**
 * Close a booking that will never be paid — the Stripe session expired, or the
 * payment failed outright.
 *
 * The car is already free (the hold lapsed with the session), so this is about
 * the record saying what happened. The lead is left exactly where it is, in
 * "New": somebody who got as far as a payment page and did not finish is worth
 * a phone call, and archiving them automatically would throw that away.
 */
export async function closeUnpaidBooking(options: {
  sessionId: string;
  status: "expired" | "cancelled";
}): Promise<void> {
  const now = new Date();
  const [closed] = await db
    .update(bookings)
    .set({
      status: options.status,
      cancelledAt: options.status === "cancelled" ? now : null,
      // A failed payment, not a person: neither the guest nor the team decided
      // this. `expired` is not a cancellation at all, so it records no path.
      cancelledVia: options.status === "cancelled" ? "system" : null,
      updatedAt: now,
    })
    .where(
      and(
        eq(bookings.stripeSessionId, options.sessionId),
        // Never walk back a confirmed booking. A late `expired` event after a
        // successful payment must not un-sell a tour.
        eq(bookings.status, "pending"),
      ),
    )
    .returning();

  if (!closed) return;

  await recordAuditOrWarn({
    actorUserId: null,
    action: "booking.expired",
    entityType: "booking",
    entityId: closed.id,
    after: { ref: bookingRef(closed.id), date: closed.date, status: options.status },
    ipAddress: null,
  });
}
