/**
 * One booking, rendered into the facts an email can be built from.
 *
 * Extracted the moment a second flow needed it. Confirmation and cancellation
 * describe the *same* booking to the same two people, and the party label, the
 * add-on names, the departure and the formatted total have to read identically
 * in both or the pair of emails looks like it came from two systems. Building
 * that twice is how they drift; building it here is how they cannot.
 *
 * `server-only`, because resolving a booking means the database and the
 * catalogue. The rendering half — turning these facts into HTML and text —
 * stays in `lib/booking-emails.ts`, which stays pure and testable without one.
 */
import "server-only";

import type { Booking, tourRequests } from "@/db";
import { bookingEmails } from "@/content/emails";
import { departureLabel, departureTimeFollowsByEmail, meetingPoints } from "@/content/logistics";
import type { Experience } from "@/content/experiences";
import { t, type Locale } from "@/i18n/config";
import { formatDay } from "@/lib/availability";
import { bookingRef } from "@/lib/bookings";
import type { BookingEmailFacts } from "@/lib/booking-emails";
import { formatPrice } from "@/lib/money";
import { siteUrl } from "@/lib/site-origin";

/**
 * Where a cancel link points.
 *
 * Not in `lib/routes.ts`, on the same reasoning as the Stripe return page: this
 * is a transactional URL reached once, from an email, carrying a credential. It
 * has no place in the nav, the sitemap or the hreflang set — and putting it in
 * the route table would invite exactly that.
 *
 * The locale is the guest's own, so the page opens in the language their
 * confirmation was written in.
 */
export function cancelUrl(locale: Locale, token: string): string {
  return `${siteUrl()}/${locale}/reserva/cancelar/${token}`;
}

/**
 * Everything both emails need, in the guest's language.
 *
 * `cancelToken` is the *plaintext* token, and it is passed rather than read
 * because a hash cannot be turned back into a link: only the path that minted
 * it holds the secret (see `lib/booking-checkout.ts`). `null` gives a
 * confirmation with no cancel button, which is the honest rendering of a
 * booking that has no credential.
 */
export function bookingEmailFacts(options: {
  booking: Booking;
  lead: typeof tourRequests.$inferSelect;
  /** Resolves experience slugs to names. */
  catalogue: Map<string, Experience>;
  cancelToken?: string | null;
}): BookingEmailFacts {
  const { booking, lead, catalogue, cancelToken = null } = options;
  const locale = booking.locale;

  const name = (slug: string) => {
    const entry = catalogue.get(slug);
    // A retired add-on still has to be nameable in the email of the guest who
    // bought it; the slug is a poor name but it is never a blank line.
    return entry ? t(entry.title, locale) : slug;
  };

  // "2 adultos · 1 criança (4–12)" — zero-count bands are simply not said.
  const w = bookingEmails.guest.partyWords;
  const partyLabel = [
    [booking.adults, w.adult, w.adults] as const,
    [booking.children, w.child, w.children] as const,
    [booking.infants, w.infant, w.infants] as const,
  ]
    .filter(([count]) => count > 0)
    .map(([count, one, many]) => `${count} ${t(count === 1 ? one : many, locale)}`)
    .join(" · ");

  return {
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
    partyLabel: partyLabel || String(booking.partySize),
    total: formatPrice(booking.amountCents, locale, booking.currency),
    adminUrl: `${siteUrl()}/admin/sales/${lead.id}`,
    cancelUrl: cancelToken ? cancelUrl(locale, cancelToken) : null,
  };
}
