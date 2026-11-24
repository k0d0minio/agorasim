/**
 * A tour quote — a personalised tour the team prices by hand and the customer
 * pays through the quote page, raised from "Novo orçamento" on the Sales board
 * with no enquiry behind it (feedback round 1, "custom payment links").
 *
 * It rides the quote machinery a wedding uses — the draft, the send, the
 * token-gated page, the payment, the receipts — and differs from a wedding
 * quote in four rules, all of which live here so the builder, the checkout,
 * the occupancy and the page cannot disagree about them:
 *
 * - **One payment.** A tour quote is paid in full on acceptance: a 100%
 *   deposit, so `createQuote` writes no balance row and the T−14 job never
 *   asks for one.
 * - **The tour fee.** §4's 4% with the €10 floor and the €50 cap, not §5's
 *   6% (`lib/commission.ts`).
 * - **Its departure, not the whole day.** Once paid, it holds its departure —
 *   `morning`, `afternoon` or `full_day` — whole: every driver and every car
 *   (JAM-294, Jamie's answer of 2026-11-24). The other departure of the day
 *   stays on sale. When the group is small, the team picks the one car it uses
 *   on the paid quote: the quote then takes one driver and one car of that
 *   class, counted exactly like a booking (`countSlotOccupancy`), and the
 *   remainder of the departure is on sale again. A sent, unpaid tour quote
 *   holds nothing, as a payment link holds nothing.
 * - **Only from the team.** A tour enquiry from the site is still sold, never
 *   quoted. The lead the form writes carries {@link ADMIN_QUOTE_SOURCE}, and
 *   only such a tour lead is quotable.
 *
 * Pure and import-free at runtime, like `lib/fleet.ts`: the builder's form runs
 * the same labels in the browser.
 */
import type { Quote, TourRequest } from "@/db";
import type { SlotAvailability } from "@/lib/availability";
import type { CommissionKind } from "@/lib/commission";
import { anyVehicleFree, isVehicleClass, type VehicleClass } from "@/lib/fleet";

/** `tour_requests.source` of a lead written by "Novo orçamento". */
export const ADMIN_QUOTE_SOURCE = "admin-quote";

/** The departures a tour quote can hold. `full_day` is both. */
export const TOUR_HOLD_SLOTS = ["morning", "afternoon", "full_day"] as const;
export type TourHoldSlot = (typeof TOUR_HOLD_SLOTS)[number];

export function isTourHoldSlot(value: unknown): value is TourHoldSlot {
  return (TOUR_HOLD_SLOTS as readonly string[]).includes(value as string);
}

/**
 * What a tour quote holds once it is paid. With a class: one driver and one
 * car of that class. With `null`: the whole departure.
 */
export type TourHold = { slot: TourHoldSlot; vehicleClass: VehicleClass | null };

/** The columns that say what a quote is and what it holds. */
type QuoteHoldColumns = Partial<Pick<Quote, "kind" | "holdSlot" | "holdVehicleClass">>;

/** The share a tour quote takes up front: all of it. One payment. */
export const TOUR_QUOTE_DEPOSIT_PERCENT = 100;

/** The Portuguese words for a held departure, on the admin screens. */
export const TOUR_HOLD_SLOT_LABELS: Record<TourHoldSlot, string> = {
  morning: "Manhã (10:00)",
  afternoon: "Tarde (14:00)",
  full_day: "Dia inteiro",
};

/** The admin's words for a tour quote that holds its whole departure. */
export const WHOLE_DEPARTURE_LABEL = "Partida inteira";

/** The car classes, as the admin offers them. */
export const VEHICLE_CLASS_LABELS: Record<VehicleClass, string> = {
  "classic-small": "Clássico pequeno (3 lugares)",
  "classic-van": "VW T3 (8 lugares)",
  touring: "Viatura de turismo (8 lugares)",
};

/**
 * The hold a quote row carries, or `null` for a wedding or event quote.
 *
 * A tour quote with a departure and no car holds the whole departure. A row
 * with a car and no departure, or with a class the fleet no longer knows,
 * holds nothing rather than half a car.
 */
export function tourHoldOf(quote: QuoteHoldColumns): TourHold | null {
  const slot = quote.holdSlot ?? null;
  const vehicleClass = quote.holdVehicleClass ?? null;
  if (!isTourHoldSlot(slot)) return null;
  if (vehicleClass === null) return quote.kind === "tour" ? { slot, vehicleClass: null } : null;
  if (!isVehicleClass(vehicleClass)) return null;
  return { slot, vehicleClass };
}

/**
 * Whether a quote is a tour quote. Read from the quote, never from its lead.
 *
 * `kind` is the marker (migration 0044). A row with a car also counts, so a
 * quote that the previous deployment wrote while the migration ran is still a
 * tour quote.
 */
export function isTourQuote(quote: QuoteHoldColumns): boolean {
  return quote.kind === "tour" || quote.holdVehicleClass != null;
}

/** The departures a hold takes, in day order. */
export function heldDepartures(slot: TourHoldSlot): ("morning" | "afternoon")[] {
  return slot === "full_day" ? ["morning", "afternoon"] : [slot];
}

/**
 * Whether one departure still has what a tour quote needs, as the team sells
 * it: on sale for the team, no event on the day, no other tour quote holding
 * the departure, and a driver and a car free. With a class, the car is one of
 * that class. With `null` (the whole departure), any free car will do: the
 * bookings already on the departure keep their car, and the quote takes what
 * is left. A tour quote never joins an open car — it is private.
 */
export function tourHoldFits(
  departure: Pick<SlotAvailability, "onSale" | "heldByEvent" | "driversLeft" | "vehiclesLeft"> &
    Partial<Pick<SlotAvailability, "heldByTour">>,
  vehicleClass: VehicleClass | null,
): boolean {
  if (!departure.onSale || departure.heldByEvent || departure.heldByTour) return false;
  if (departure.driversLeft <= 0) return false;
  return vehicleClass === null
    ? anyVehicleFree(departure.vehiclesLeft)
    : departure.vehiclesLeft[vehicleClass] > 0;
}

/** The commission a quote's payments take: the tour rate or the events rate. */
export function commissionKindOf(quote: QuoteHoldColumns): CommissionKind {
  return isTourQuote(quote) ? "tour" : "event";
}

/**
 * Whether a lead may be quoted at all.
 *
 * A wedding or an event, as always. A tour only when the team wrote the lead
 * from "Novo orçamento": a tour request from the site is sold, not quoted.
 * Never an anonymised person — the retention job has already erased who the
 * quote would be for.
 */
export function isQuotableLead(
  lead: Pick<TourRequest, "kind" | "anonymisedAt"> & Partial<Pick<TourRequest, "source">>,
): boolean {
  if (lead.anonymisedAt !== null) return false;
  return lead.kind !== "tour" || lead.source === ADMIN_QUOTE_SOURCE;
}

/** Whether a lead's page shows the Orçamento card: the same rule, erasure aside. */
export function isQuotedKind(
  lead: Pick<TourRequest, "kind"> & Partial<Pick<TourRequest, "source">>,
): boolean {
  return lead.kind !== "tour" || lead.source === ADMIN_QUOTE_SOURCE;
}
