/**
 * The platform's commission, as arithmetic.
 *
 * The Commission & Payments Agreement (§4–5) is two rates and three numbers:
 *
 * - **Tours** — 4% of the final booking total, never less than €10, never more
 *   than €50. The floor keeps a small booking worth running the system for; the
 *   cap stops a large private group being over-charged for the same work.
 * - **Car hire & events** — 6% of the total booking value, with no floor and no
 *   cap. Those are collected as a 30% deposit and a balance (`quote-flow`), and
 *   §5 says the fee is taken *proportionally on each payment* — which is
 *   exactly what asking this module for 6% of each payment produces, because
 *   6% of the deposit plus 6% of the balance is 6% of the whole. Nothing here
 *   has to know a payment is part of a larger booking.
 *
 * **Deliberately pure**, in the shape of `lib/pricing.ts`: no `server-only`, no
 * imports, no environment. The checkout path computes the fee it will ask
 * Stripe for, the confirmation path recomputes it to explain the fee Stripe
 * actually took, and a quote screen can show a commission line in the browser —
 * all from one function, so the three can never drift.
 *
 * **What this module does not decide** is whether a fee is charged at all. That
 * is a deployment question — no connected account, no application fee — and it
 * belongs to `lib/stripe.ts` and its callers. Asking here always answers with
 * the agreement's figure.
 *
 * **Integer euro cents everywhere**, as in the rest of the engine: the unit
 * Stripe charges in, and the only unit in which a percentage of money can be
 * added up without a rounding error eventually reaching a guest.
 */

/** Which rate applies: the tour table (§4) or the events one (§5). */
export type CommissionKind = "tour" | "event";

/**
 * Which of the agreement's three rules produced the figure.
 *
 * Recorded per booking (`bookings.commission_bound`) so a reconciliation
 * against the Stripe dashboard answers "why €50?" without re-deriving it:
 * `rate` is the percentage itself, `floor` and `cap` are the two bounds §4 puts
 * around it. Events are always `rate` — §5 has neither bound.
 */
export type CommissionBound = "rate" | "floor" | "cap";

/** One rate as the agreement states it. `null` means "no such bound". */
export type CommissionRate = {
  /** The percentage, in basis points — 400 is 4%. */
  rateBps: number;
  floorCents: number | null;
  capCents: number | null;
};

/**
 * The agreement's §10 summary table, as data.
 *
 * Basis points rather than a float: 4% of a total has to be an exact integer
 * calculation, and `0.04` is not exactly four hundredths in binary.
 */
export const COMMISSION_RATES: Record<CommissionKind, CommissionRate> = {
  // §4 — "4% of the total the guest pays · minimum €10 · maximum €50".
  tour: { rateBps: 400, floorCents: 1000, capCents: 5000 },
  // §5 — "6% of the total booking value", collected via payment links. No
  // bounds: a wedding is never small enough to need a floor.
  event: { rateBps: 600, floorCents: null, capCents: null },
};

/** A computed commission, and the reasoning behind the number. */
export type Commission = {
  kind: CommissionKind;
  /** What the fee was charged on — a booking total, or one payment of one. */
  basisCents: number;
  /** The rate applied, in basis points. Written to the booking row. */
  rateBps: number;
  /** The fee itself, in cents. This is Stripe's `application_fee_amount`. */
  feeCents: number;
  /** Which rule decided {@link feeCents}. See {@link CommissionBound}. */
  bound: CommissionBound;
};

/**
 * The commission on one payment.
 *
 * `basisCents` is what the guest is paying in this transaction: the whole total
 * for a tour, one instalment for an event. Rounds to the nearest cent — a
 * half-cent of commission is not chargeable, and rounding down by default would
 * quietly shave the rate on every booking.
 *
 * Throws on anything that is not a whole number of cents. A non-integer total
 * means somebody did money in floats upstream, and computing a plausible fee
 * from it would hide that instead of surfacing it — every caller here is
 * handing over a figure that came from `lib/pricing.ts` or the database, both
 * of which are integers by construction.
 */
export function commissionOn(kind: CommissionKind, basisCents: number): Commission {
  if (!Number.isSafeInteger(basisCents) || basisCents < 0) {
    throw new Error(
      `commissionOn: ${basisCents} is not a whole number of cents — money is integers here`,
    );
  }

  const { rateBps, floorCents, capCents } = COMMISSION_RATES[kind];

  // Nothing was paid, so nothing is owed — and specifically *not* the €10
  // floor, which exists to make a small booking viable, not to invent a fee
  // where there is no payment.
  if (basisCents === 0) {
    return { kind, basisCents, rateBps, feeCents: 0, bound: "rate" };
  }

  const rated = Math.round((basisCents * rateBps) / 10_000);

  let feeCents = rated;
  let bound: CommissionBound = "rate";
  if (floorCents !== null && feeCents < floorCents) {
    feeCents = floorCents;
    bound = "floor";
  }
  if (capCents !== null && feeCents > capCents) {
    feeCents = capCents;
    bound = "cap";
  }

  /**
   * A fee can never be larger than the payment it comes out of — Stripe
   * rejects an `application_fee_amount` above the charge, and the whole of a
   * guest's money is not a commission.
   *
   * Only reachable below €10, where the floor outruns the total; no tour on the
   * price list comes close. `bound` still reads `floor`, because the floor is
   * what drove the number, and a €7 booking that yields a €7 fee is the honest
   * record of that rule meeting that total.
   */
  if (feeCents > basisCents) feeCents = basisCents;

  return { kind, basisCents, rateBps, feeCents, bound };
}
