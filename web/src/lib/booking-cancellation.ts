/**
 * The guest's own way out: a link, a booking, and the 48-hour promise.
 *
 * **Two questions, and only two.** "Whose booking is this link?" and "may they
 * still call it off?" Everything after the second yes — the refund, the seat,
 * the guest's email, the audit row — belongs to `lib/booking-refund.ts` and is
 * called, not re-implemented. That module exists precisely because the Sales
 * board and this page must end a booking identically; the only fact they differ
 * on is `cancelledVia`.
 *
 * **The token is the identity.** `bookings` holds no name, email or phone (see
 * the table note in `db/schema.ts`), so there is nobody to log in as: the value
 * in the URL is the whole of the authentication, and it is checked by hashing
 * it and looking the row up by digest (`lib/cancellation-token.ts`). Which
 * means every failure — a truncated link, a spent token, a booking already
 * cancelled, a secret that has been rotated — has to come back as the *same*
 * neutral answer. A page that distinguished "no such token" from "that booking
 * is already cancelled" would be an oracle for whoever is guessing.
 *
 * **Spent on use, not on success.** The token is cleared once the booking stops
 * being confirmed, including when Stripe refuses the refund: the cancellation
 * has happened at that point, the seat is free, and a link that still worked
 * would offer to do it again. `bookings_cancellation_token_key` is a unique
 * index over a nullable column, which is what makes clearing it legal for any
 * number of rows.
 *
 * **What is left to the operator on purpose.** Nothing here reschedules, and
 * nothing here refunds in part. The guest's promise is "free cancellation, full
 * refund"; every softer or harder answer — weather, goodwill, a party that
 * shrank — is Rita's judgement from the Sales board, and a rule in this file
 * would only be a rule she had to work around.
 */
import "server-only";

import { eq } from "drizzle-orm";

import { bookings, db, tourRequests, type Booking } from "@/db";
import { bookingEmails } from "@/content/emails";
import { departureLabel } from "@/content/logistics";
import { t, type Locale } from "@/i18n/config";
import { BUSINESS_TIME_ZONE, formatDay } from "@/lib/availability";
import { partyLabel, teamCancellationEmail } from "@/lib/booking-emails";
import { cancelAndRefundBooking, isCancellable, refundableCents } from "@/lib/booking-refund";
import { bookingRef } from "@/lib/bookings";
import {
  cancellationTokenDigest,
  isCancellationTokenConfigured,
  looksLikeCancellationToken,
} from "@/lib/cancellation-token";
import { cancellationWindow, formatDeadline } from "@/lib/cancellation-window";
import { isEmailConfigured, teamRecipients } from "@/lib/email";
import { listCatalogue } from "@/lib/experience-catalogue";
import { sendLoggedEmail } from "@/lib/message-log";
import { formatPrice } from "@/lib/money";
import { siteUrl } from "@/lib/site-origin";

/**
 * The booking as its own guest is shown it — strings, already in their
 * language, and nothing they did not already know.
 *
 * No id, no payment intent, no email address: the token proves somebody holds
 * the link, not that they are the person who booked, and a forwarded
 * confirmation is a realistic way for it to be read by somebody else. So the
 * page shows what the confirmation email already showed them and no more.
 */
export type GuestBookingSummary = {
  ref: string;
  /** "Rural Saloia — por grupo". */
  experience: string;
  /** "sábado, 15 de agosto de 2026". */
  date: string;
  /** "Manhã · 10h00". */
  departure: string;
  partyLabel: string;
  /** "€340" — what they paid. */
  total: string;
  /** "€340" — what cancelling now would return. */
  refund: string;
  /** "quinta-feira, 13 de agosto de 2026, 10:00" — the 48-hour boundary. */
  deadline: string;
};

/** What the cancel page has to render. */
export type GuestCancellationView =
  /** Unknown, spent, revoked, or a booking that is already over. One answer. */
  | { kind: "unknown" }
  | { kind: "found"; open: boolean; summary: GuestBookingSummary };

/** Format a booking for the page and for the confirmation step. */
async function summarise(
  booking: Booking,
  locale: Locale,
  deadline: Date,
): Promise<GuestBookingSummary> {
  const catalogue = new Map((await listCatalogue()).map((entry) => [entry.slug, entry]));
  const experience = catalogue.get(booking.experienceSlug);

  return {
    ref: bookingRef(booking.id),
    // A retired route still has to be nameable to the guest who bought it; the
    // slug is a poor name but never a blank — same rule as the emails.
    experience: `${experience ? t(experience.title, locale) : booking.experienceSlug} — ${t(bookingEmails.guest.modeWords[booking.mode], locale)}`,
    date: formatDay(booking.date, locale),
    departure: t(departureLabel(booking.experienceSlug, booking.slot), locale),
    partyLabel: partyLabel(booking, locale),
    total: formatPrice(booking.amountCents, locale, booking.currency),
    refund: formatPrice(refundableCents(booking), locale, booking.currency),
    deadline: formatDeadline(deadline, locale),
  };
}

/**
 * The booking a link belongs to, or nothing.
 *
 * Cheap rejections first — a value that is not token-shaped, and a deployment
 * with no `BOOKING_TOKEN_SECRET` — so neither the HMAC nor the database is
 * reached by traffic that a regex can turn away. A missing secret fails closed
 * here rather than throwing: `cancellationTokenDigest` would raise, and an
 * unconfigured deployment must show the neutral page, not a stack trace.
 */
async function bookingForToken(token: string): Promise<Booking | null> {
  if (!looksLikeCancellationToken(token)) return null;
  if (!isCancellationTokenConfigured()) return null;

  const digest = await cancellationTokenDigest(token);
  const [booking] = await db
    .select()
    .from(bookings)
    .where(eq(bookings.cancellationTokenHash, digest))
    .limit(1);

  // A booking that is not `confirmed` is over — cancelled, refunded, expired,
  // or never paid for. Nothing on this page applies to it, and saying so in its
  // own words would tell a guesser they had found a real row.
  if (!booking || !isCancellable(booking)) return null;
  return booking;
}

/**
 * Resolve a cancel link for rendering. Read-only; changes nothing.
 *
 * `locale` is the path the guest is standing on rather than the language
 * recorded on the booking, on the same reasoning as the confirmation page: the
 * page somebody is reading right now is the better evidence of the language
 * they read. Unlike that page this one does not write the choice back — reading
 * a link is not a decision about anything.
 */
export async function resolveGuestCancellation(options: {
  token: string;
  locale: Locale;
  now?: Date;
}): Promise<GuestCancellationView> {
  const { token, locale, now = new Date() } = options;

  const booking = await bookingForToken(token);
  if (!booking) return { kind: "unknown" };

  const stillOpen = cancellationWindow(booking, now);
  // An unreadable date falls through to the neutral page rather than to a
  // panel: "we cannot tell when this leaves" must never become a refund on a
  // tour departing tomorrow, and it must not become an invented deadline
  // either. `bookings.date` is a `date` column, so this is defence rather than
  // a case anybody has seen.
  if (!stillOpen) {
    console.error(
      `[cancel] ${bookingRef(booking.id)} has an undatable departure (${booking.date}/${booking.slot})`,
    );
    return { kind: "unknown" };
  }

  return {
    kind: "found",
    open: stillOpen.open,
    summary: await summarise(booking, locale, stillOpen.deadline),
  };
}

/** What actually happened when the guest pressed the button. */
export type GuestCancellationOutcome =
  /** Done. `refund` is what went back, already formatted. */
  | { status: "cancelled"; refund: string }
  /** Inside 48 hours — re-checked here, because this is the check that counts. */
  | { status: "too-late"; deadline: string }
  /** Unknown, spent, or already over. The neutral answer. */
  | { status: "unknown" }
  /** Cancelled and the seat is free; Stripe refused the money. Needs a human. */
  | { status: "refund-failed" }
  /** Anything else — Stripe switched off, a row we cannot refund against. */
  | { status: "error" };

/**
 * Cancel a booking from its own link: full refund, seat freed, both sides told.
 *
 * The window is re-checked here even though the page already checked it. The
 * page's answer was rendered at some earlier moment, by a request that may have
 * been served from a phone left open overnight, and what a browser posts is
 * whatever the person posting it wants — so the render is a suggestion and this
 * is the decision. It is the same relationship `checkDayBookable` has with the
 * calendar the guest picked a day from.
 *
 * Idempotent by inheritance: `cancelAndRefundBooking` claims the row under a
 * `status = 'confirmed'` guard, so a double-submitted form has exactly one
 * winner and the loser is told the booking is already over — which it is.
 */
export async function cancelBookingWithToken(options: {
  token: string;
  locale: Locale;
  now?: Date;
}): Promise<GuestCancellationOutcome> {
  const { token, locale, now = new Date() } = options;

  const booking = await bookingForToken(token);
  if (!booking) return { status: "unknown" };

  const stillOpen = cancellationWindow(booking, now);
  if (!stillOpen) return { status: "unknown" };
  if (!stillOpen.open) {
    return { status: "too-late", deadline: formatDeadline(stillOpen.deadline, locale) };
  }

  const refundCents = refundableCents(booking);
  const outcome = await cancelAndRefundBooking({
    bookingId: booking.id,
    // The promise is "free cancellation" — the whole of what is left, and never
    // a fee this page invented. A partial refund is the team's call, not a
    // guest's, and there is no control here that could ask for one.
    refundCents,
    via: "guest",
    // Nobody at the business pressed this. The audit row's actor is the same
    // `null` the webhook and the retention job use, and `cancelledVia: guest`
    // is what says which of the three it was.
    actorUserId: null,
  });

  switch (outcome.status) {
    case "cancelled": {
      await spendToken(booking.id);
      await notifyTeam({ booking: outcome.booking, refundCents, refundFailed: false, now });
      return {
        status: "cancelled",
        refund: formatPrice(refundCents, locale, booking.currency),
      };
    }

    case "refund-failed": {
      // The booking *is* cancelled and the car *is* free; only the money is
      // outstanding. The link is spent for that reason — offering to cancel it
      // again would neither cancel nor refund anything.
      await spendToken(booking.id);
      await notifyTeam({ booking: outcome.booking, refundCents, refundFailed: true, now });
      return { status: "refund-failed" };
    }

    case "not-found":
    case "not-cancellable":
      // The Sales board got there first, or the form was submitted twice. Both
      // are the truth, and both are the neutral answer.
      await spendToken(booking.id);
      return { status: "unknown" };

    case "amount-too-large":
    case "refund-unavailable":
      // Neither is reachable from here in normal operation — the amount is read
      // off the row a line above, and a confirmed booking carries a payment
      // intent. If one happens, the booking is untouched and the link still
      // works, so the guest is asked to try again or call.
      console.error(
        `[cancel] ${bookingRef(booking.id)} could not be refunded from the guest link (${outcome.status})`,
      );
      return { status: "error" };
  }
}

/**
 * Burn the link.
 *
 * Best-effort and never throws: the booking is already cancelled by the time
 * this runs, and failing the guest's request because one UPDATE did not land
 * would tell them to do the whole thing again. A token left alive on a
 * cancelled booking resolves to the neutral page anyway — `bookingForToken`
 * refuses anything that is not `confirmed` — so this is defence in depth rather
 * than the thing that makes single use true.
 */
async function spendToken(bookingId: string): Promise<void> {
  try {
    await db
      .update(bookings)
      .set({ cancellationTokenHash: null, updatedAt: new Date() })
      .where(eq(bookings.id, bookingId));
  } catch (err) {
    console.error(`[cancel] ${bookingRef(bookingId)} token not cleared`, err);
  }
}

const cancelledAtFormatter = new Intl.DateTimeFormat("pt-PT", {
  timeZone: BUSINESS_TIME_ZONE,
  dateStyle: "short",
  timeStyle: "short",
});

/**
 * Tell Diogo & Rita. Best-effort and never throws — the booking is cancelled
 * and the guest has been told either way, and a mail server having a bad
 * afternoon must not turn a completed cancellation into an error page.
 *
 * The guest's own notice is not sent from here: `cancelAndRefundBooking` has
 * already sent it, in the guest's language, from the copy both cancellation
 * paths share.
 *
 * Through the message log, under `booking-cancellation`/`team` — the same kind
 * as the guest's notice and a different recipient, which is what makes "the
 * guest was told and the team was not" a state the Notifications page can show.
 * One per booking: a `duplicate` means the team already has it.
 */
async function notifyTeam(options: {
  booking: Booking;
  refundCents: number;
  refundFailed: boolean;
  now: Date;
}): Promise<void> {
  const { booking, refundCents, refundFailed, now } = options;

  const recipients = teamRecipients();
  if (!isEmailConfigured() || recipients.length === 0) return;

  try {
    const lead = booking.tourRequestId
      ? (
          await db
            .select()
            .from(tourRequests)
            .where(eq(tourRequests.id, booking.tourRequestId))
            .limit(1)
        )[0]
      : undefined;

    const catalogue = new Map((await listCatalogue()).map((entry) => [entry.slug, entry]));
    // The guest's language, not the team's: the team's mail reports what the
    // guest was shown, and a date they can read back to them on the phone.
    const locale = booking.locale;
    const experience = catalogue.get(booking.experienceSlug);

    const result = await sendLoggedEmail(
      {
        kind: "booking-cancellation",
        recipient: "team",
        bookingId: booking.id,
        tourRequestId: booking.tourRequestId,
      },
      teamCancellationEmail(
        {
          ref: bookingRef(booking.id),
          // An erased lead (Art. 17) leaves a booking with no name on it, which
          // is the correct outcome of an erasure — the notification says so
          // rather than failing to send.
          guestName: lead?.name ?? bookingRef(booking.id),
          guestEmail: lead?.email ?? "",
          guestPhone: lead?.phone ?? null,
          locale,
          date: formatDay(booking.date, locale),
          experience: `${experience ? t(experience.title, locale) : booking.experienceSlug} — ${t(bookingEmails.guest.modeWords[booking.mode], locale)}`,
          departure: t(departureLabel(booking.experienceSlug, booking.slot), locale),
          partyLabel: partyLabel(booking, locale),
          total: formatPrice(booking.amountCents, locale, booking.currency),
          refund: refundFailed
            ? null
            : formatPrice(refundCents, locale, booking.currency),
          refundFailed,
          cancelledAt: cancelledAtFormatter.format(now),
          adminUrl: lead
            ? `${siteUrl()}/admin/sales/${lead.id}`
            : `${siteUrl()}/admin/sales`,
        },
        recipients,
      ),
    );

    if (result.status !== "sent" && result.status !== "duplicate") {
      console.error(
        `[cancel] ${bookingRef(booking.id)} cancelled but the team email was not sent (${result.reason})`,
      );
    }
  } catch (err) {
    console.error(
      `[cancel] ${bookingRef(booking.id)} cancelled but the team email failed`,
      err,
    );
  }
}
