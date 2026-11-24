/**
 * "Lembrar": which booking the team can remind of its payment (JAM-292).
 *
 * A guest who leaves the site checkout before paying leaves an unpaid booking:
 * `pending` while its Stripe session lives, `expired` from then on
 * (`closeUnpaidBooking` in `lib/booking-checkout.ts`). A reminder turns that
 * booking into a payment-link booking and emails the link
 * (`sendPaymentReminder` in `lib/payment-link.ts`). From then on the booking
 * follows the rules of a link: it holds no car, it confirms itself when the
 * guest pays, and it stays `pending` until its departure is past.
 *
 * This file is the rule only, with no database: the Sales card, the lead's
 * page and the action all ask it, so the button and the refusal cannot
 * disagree.
 */
import type { Booking } from "@/db";
import { todayKey } from "@/lib/date-keys";

/** Why a booking cannot be reminded. */
export type ReminderBlock =
  /** Paid, or paid and refunded: there is nothing to ask for. */
  | "paid"
  /** Cancelled: by the team ("Anular link"), or by a payment that failed. */
  | "closed"
  /** The departure day is past. */
  | "past"
  /** The guest is on the payment form now, inside a live hold. */
  | "in-checkout"
  /** The team registered this booking with its own link: "Reenviar link" is its button. */
  | "team-link";

export type ReminderVerdict = { ok: true } | { ok: false; reason: ReminderBlock };

/** The facts of a booking that the rule reads. */
export type ReminderBooking = Pick<
  Booking,
  "status" | "holdExpiresAt" | "paymentLinkTokenHash" | "date"
>;

/**
 * Whether one booking can be reminded now.
 *
 * `reminded` says that the booking already had a reminder (a
 * `booking-payment-reminder` row in `message_log`). It is what tells a
 * reminded checkout from a booking the team registered with a link: both carry
 * a `payment_link_token_hash`, and only the first keeps the "Lembrar" button.
 *
 * The caller adds the two conditions that are not facts of the booking: it is
 * the lead's newest booking, and the lead has an email.
 */
export function reminderVerdict(
  booking: ReminderBooking,
  options: { reminded: boolean; now?: Date },
): ReminderVerdict {
  const now = options.now ?? new Date();

  if (booking.status === "confirmed" || booking.status === "refunded") {
    return { ok: false, reason: "paid" };
  }
  if (booking.status === "cancelled") return { ok: false, reason: "closed" };
  if (booking.date < todayKey(now)) return { ok: false, reason: "past" };
  if (booking.status === "pending" && booking.holdExpiresAt.getTime() > now.getTime()) {
    return { ok: false, reason: "in-checkout" };
  }
  if (booking.paymentLinkTokenHash !== null && !options.reminded) {
    return { ok: false, reason: "team-link" };
  }
  return { ok: true };
}

/** {@link reminderVerdict}, as a yes or a no. */
export function canRemind(
  booking: ReminderBooking,
  options: { reminded: boolean; now?: Date },
): boolean {
  return reminderVerdict(booking, options).ok;
}

/**
 * "12/11 14:05": when the last reminder went, in Lisbon time, as the Sales
 * card says it after "Lembrete enviado". Short on purpose: the card is a
 * phone-width column, and the year adds nothing to a booking that is weeks away.
 */
const reminderTimeFormatter = new Intl.DateTimeFormat("pt-PT", {
  timeZone: "Europe/Lisbon",
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

export function formatReminderTime(sentAt: Date): string {
  const parts = new Map(
    reminderTimeFormatter.formatToParts(sentAt).map((part) => [part.type, part.value]),
  );
  return `${parts.get("day")}/${parts.get("month")} ${parts.get("hour")}:${parts.get("minute")}`;
}
