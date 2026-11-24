import "server-only";

import { db, refunds } from "@/db";

/**
 * Write one refund to the `refunds` ledger (JAM-528).
 *
 * The refund paths call this after they have recorded the new refunded total
 * on the payment row, with the amount that went back *now*: the difference
 * between the new total and the old one. Each row is one line of "Para
 * faturar", and one nota de crédito.
 *
 * Best effort, on purpose. The money already went back and the payment row
 * already says so. A failed write here costs one line of the invoicing list,
 * and never the refund or its notice. The unique Stripe refund id makes a
 * second write of the same refund (the admin refund and its webhook echo) a
 * no-op.
 */
export async function recordRefund(entry: {
  bookingId?: string;
  quotePaymentId?: string;
  amountCents: number;
  currency: string;
  stripeRefundId: string | null;
  refundedAt: Date;
}): Promise<void> {
  if (entry.amountCents <= 0) return;
  try {
    await db
      .insert(refunds)
      .values({
        bookingId: entry.bookingId ?? null,
        quotePaymentId: entry.quotePaymentId ?? null,
        amountCents: entry.amountCents,
        currency: entry.currency,
        stripeRefundId: entry.stripeRefundId,
        refundedAt: entry.refundedAt,
      })
      .onConflictDoNothing({ target: refunds.stripeRefundId });
  } catch (err) {
    console.error("[refund-ledger] could not record a refund", err);
  }
}
