/**
 * The departure check for a tour quote — "is there still a driver and a car on
 * that departure?" — asked when the team saves the quote and again before
 * Stripe opens on the quote page. And the team's change of what a paid tour
 * quote holds: its whole departure, or the one car the group uses (JAM-294).
 *
 * A sent tour quote holds nothing until it is paid (`lib/tour-quote.ts`), so
 * the departure can fill in between. The second check is what stops the
 * customer paying for a departure that is already out; the page then says to
 * call. Read through the one occupancy every seller shares
 * (`countSlotOccupancy`) and described as the team sells (`describeSlot`,
 * audience `team`), so the answer is the manual booking's answer.
 *
 * Server-only: it reads the database.
 */
import "server-only";

import type { Quote } from "@/db";
import { recordAuditOrWarn } from "@/lib/audit";
import {
  describeSlot,
  listAvailabilityRows,
  occupancySlotKey,
  todayKey,
  type DateKey,
} from "@/lib/availability";
import { countSlotOccupancy } from "@/lib/bookings";
import { quoteHoldsDate, withoutTourHold } from "@/lib/event-holds";
import type { VehicleClass } from "@/lib/fleet";
import { getQuote, quoteRef, setQuoteHoldCar } from "@/lib/quotes";
import {
  heldDepartures,
  isTourQuote,
  tourHoldFits,
  tourHoldOf,
  type TourHold,
} from "@/lib/tour-quote";

/** The answer: free, full, or the database could not say. */
export type TourHoldCheck = { ok: true } | { ok: false; reason: "unavailable" | "unreadable" };

/**
 * Whether every departure a tour quote would hold still has what it needs: a
 * driver and a car of its class, or — for a quote that takes the whole
 * departure — a driver and any car (`tourHoldFits`).
 *
 * `release` names a hold to leave out of the count: the quote's own, when the
 * team changes what a paid quote holds.
 *
 * A database failure is a "no", as at the checkout re-check: a quote must not
 * be sold against a count nobody could read.
 */
export async function checkTourHold(options: {
  date: DateKey;
  hold: TourHold;
  release?: { quoteId: string; vehicleClass: TourHold["vehicleClass"] };
  now?: Date;
}): Promise<TourHoldCheck> {
  const { date, hold, release, now = new Date() } = options;
  try {
    const [occupancy, rows] = await Promise.all([
      countSlotOccupancy({ from: date, to: date, now }),
      listAvailabilityRows(date, date),
    ]);
    const byKey = new Map(rows.map((row) => [occupancySlotKey(row.date, row.slot), row]));
    for (const slot of heldDepartures(hold.slot)) {
      const key = occupancySlotKey(date, slot);
      const counted = occupancy.get(key);
      const departure = describeSlot({
        date,
        slot,
        row: byKey.get(key) ?? null,
        occupancy: counted && release ? withoutTourHold(counted, release) : counted,
        now,
        audience: "team",
      });
      if (!tourHoldFits(departure, hold.vehicleClass)) return { ok: false, reason: "unavailable" };
    }
    return { ok: true };
  } catch (err) {
    console.error("[tour-quote] could not check a tour quote's departure", err);
    return { ok: false, reason: "unreadable" };
  }
}

/** What became of a change of a paid tour quote's hold. */
export type TourCarChange =
  | { status: "changed"; quote: Quote }
  /** The quote already holds exactly this. Nothing was written. */
  | { status: "unchanged" }
  | { status: "not-found" }
  /** Not a paid tour quote: a draft, a sent or cancelled one, or an event. */
  | { status: "not-held" }
  /** The departure day is past. */
  | { status: "past" }
  /** The departure has no driver or no car of that class free. */
  | { status: "no-car"; reason: "unavailable" | "unreadable" };

/**
 * Whether the team may change what a quote holds: a tour quote, paid and not
 * cancelled, with a departure that is today or later. Pure — the lead page
 * asks it to decide whether the two buttons show, and the change asks it again.
 */
export function tourCarVerdict(
  quote: Pick<Quote, "status" | "eventDate" | "kind" | "holdSlot" | "holdVehicleClass">,
  today: DateKey,
): "ok" | "not-held" | "past" {
  if (!isTourQuote(quote) || !tourHoldOf(quote) || !quoteHoldsDate(quote)) return "not-held";
  return quote.eventDate < today ? "past" : "ok";
}

/**
 * The team's two buttons on a paid tour quote (JAM-294).
 *
 * With a class: the group uses that one car. The quote then holds one driver
 * and that car, and the remainder of the departure is on sale again. Refused
 * when the departure has no driver or no car of that class free, counted
 * without the quote's own hold. With `null`: the quote holds its whole
 * departure again. No capacity check then: the bookings that came in meanwhile
 * keep their car, and the quote takes what is left.
 *
 * One audit line for each change, with who made it.
 */
export async function changeTourQuoteCar(options: {
  quoteId: string;
  vehicleClass: VehicleClass | null;
  actorUserId: string;
  now?: Date;
}): Promise<TourCarChange> {
  const { quoteId, vehicleClass, actorUserId, now = new Date() } = options;

  const quote = await getQuote(quoteId);
  if (!quote) return { status: "not-found" };
  const verdict = tourCarVerdict(quote, todayKey(now));
  if (verdict !== "ok") return { status: verdict };
  const hold = tourHoldOf(quote);
  if (!hold) return { status: "not-held" };
  if (hold.vehicleClass === vehicleClass) return { status: "unchanged" };

  if (vehicleClass !== null) {
    const car = await checkTourHold({
      date: quote.eventDate,
      hold: { slot: hold.slot, vehicleClass },
      release: { quoteId: quote.id, vehicleClass: hold.vehicleClass },
      now,
    });
    if (!car.ok) return { status: "no-car", reason: car.reason };
  }

  const written = await setQuoteHoldCar(quote.id, vehicleClass, now);
  // Cancelled from the other phone since the read above.
  if (!written) return { status: "not-held" };

  await recordAuditOrWarn({
    actorUserId,
    action: "quote.hold_changed",
    entityType: "tour_request",
    entityId: written.tourRequestId,
    before: { quoteRef: quoteRef(written.id), slot: hold.slot, vehicleClass: hold.vehicleClass },
    after: { quoteRef: quoteRef(written.id), slot: hold.slot, vehicleClass },
  });

  return { status: "changed", quote: written };
}
