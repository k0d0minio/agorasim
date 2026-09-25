/**
 * The no-show mark — "Faltou" on the Sales board.
 *
 * **A mark, not a status.** The booking stays `confirmed`, keeps its money and
 * its place in the history; `bookings.no_show_at` is read by exactly one thing,
 * the post-tour thank-you (`thankableOnSql` in `lib/bookings.ts`), so a guest
 * who never turned up is not thanked for a tour they did not take. Nothing
 * about refunds, commission or capacity changes.
 *
 * **When it can be set.** Only on a paid booking whose tour is today or in the
 * past, on Lisbon's calendar: a future tour has nobody to miss yet. The
 * thank-you goes out the next morning, so the team marks it on the day.
 * Clearing it ("Retirar falta") is allowed whenever it is set — a mis-tap is
 * undone without conditions. Both writes are audited with who and when.
 */
import "server-only";

import { and, eq, isNotNull, isNull, lte } from "drizzle-orm";

import { bookings, db, type Booking } from "@/db";
import { todayKey } from "@/lib/availability";
import { recordAuditOrWarn } from "@/lib/audit";

/** Whether a booking may be marked as a no-show at `now`. Pure — the rule. */
export function canMarkNoShow(
  booking: Pick<Booking, "status" | "date" | "noShowAt">,
  now: Date = new Date(),
): boolean {
  return booking.status === "confirmed" && booking.noShowAt === null && booking.date <= todayKey(now);
}

export type NoShowOutcome =
  | { status: "marked" }
  | { status: "cleared" }
  | { status: "not-found" }
  /** Marking a booking that is not paid, or whose tour has not happened yet. */
  | { status: "not-markable" }
  /** Already in the state asked for — a double-submitted form. */
  | { status: "unchanged" };

export async function setNoShow(options: {
  bookingId: string;
  noShow: boolean;
  actorUserId: string;
  now?: Date;
}): Promise<NoShowOutcome> {
  const { bookingId, noShow, actorUserId, now = new Date() } = options;

  const [booking] = await db
    .select({ id: bookings.id, status: bookings.status, date: bookings.date, noShowAt: bookings.noShowAt })
    .from(bookings)
    .where(eq(bookings.id, bookingId))
    .limit(1);
  if (!booking) return { status: "not-found" };

  if (noShow) {
    if (booking.noShowAt !== null) return { status: "unchanged" };
    if (!canMarkNoShow(booking, now)) return { status: "not-markable" };
  } else if (booking.noShowAt === null) {
    return { status: "unchanged" };
  }

  // The write re-states the rule it was allowed under, so a cancel, a move or
  // a second tap that landed between the read and here changes nothing — the
  // same guard `lib/booking-move.ts` puts on its update.
  const noShowAt = noShow ? now : null;
  const written = await db
    .update(bookings)
    .set({ noShowAt, updatedAt: now })
    .where(
      noShow
        ? and(
            eq(bookings.id, bookingId),
            eq(bookings.status, "confirmed"),
            lte(bookings.date, todayKey(now)),
            isNull(bookings.noShowAt),
          )
        : and(eq(bookings.id, bookingId), isNotNull(bookings.noShowAt)),
    )
    .returning({ id: bookings.id });
  if (written.length === 0) return { status: "unchanged" };

  await recordAuditOrWarn({
    actorUserId,
    action: noShow ? "booking.no_show_marked" : "booking.no_show_cleared",
    entityType: "booking",
    entityId: bookingId,
    before: { noShowAt: booking.noShowAt?.toISOString() ?? null },
    after: { noShowAt: noShowAt?.toISOString() ?? null },
  });

  return { status: noShow ? "marked" : "cleared" };
}
