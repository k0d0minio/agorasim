/**
 * The car check for a tour quote — "is there still a driver and a car of this
 * class on that departure?" — asked when the team saves the quote and again
 * before Stripe opens on the quote page.
 *
 * A sent tour quote holds nothing until it is paid (`lib/tour-quote.ts`), so
 * the departure can fill in between. The second check is what stops the
 * customer paying for a car that is already out; the page then says to call.
 * Read through the one occupancy every seller shares (`countSlotOccupancy`)
 * and described as the team sells (`describeSlot`, audience `team`), so the
 * answer is the manual booking's answer.
 *
 * Server-only: it reads the database.
 */
import "server-only";

import {
  describeSlot,
  listAvailabilityRows,
  occupancySlotKey,
  type DateKey,
} from "@/lib/availability";
import { countSlotOccupancy } from "@/lib/bookings";
import { heldDepartures, tourHoldFits, type TourHold } from "@/lib/tour-quote";

/** The answer: free, full, or the database could not say. */
export type TourHoldCheck = { ok: true } | { ok: false; reason: "unavailable" | "unreadable" };

/**
 * Whether every departure a tour quote would hold still has its car.
 *
 * A database failure is a "no", as at the checkout re-check: a quote must not
 * be sold against a count nobody could read.
 */
export async function checkTourHold(options: {
  date: DateKey;
  hold: TourHold;
  now?: Date;
}): Promise<TourHoldCheck> {
  const { date, hold, now = new Date() } = options;
  try {
    const [occupancy, rows] = await Promise.all([
      countSlotOccupancy({ from: date, to: date, now }),
      listAvailabilityRows(date, date),
    ]);
    const byKey = new Map(rows.map((row) => [occupancySlotKey(row.date, row.slot), row]));
    for (const slot of heldDepartures(hold.slot)) {
      const key = occupancySlotKey(date, slot);
      const departure = describeSlot({
        date,
        slot,
        row: byKey.get(key) ?? null,
        occupancy: occupancy.get(key),
        now,
        audience: "team",
      });
      if (!tourHoldFits(departure, hold.vehicleClass)) return { ok: false, reason: "unavailable" };
    }
    return { ok: true };
  } catch (err) {
    console.error("[tour-quote] could not check a tour quote's car", err);
    return { ok: false, reason: "unreadable" };
  }
}
