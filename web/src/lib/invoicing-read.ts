import "server-only";

import { and, eq, isNotNull } from "drizzle-orm";

import {
  bookings,
  db,
  invoiceMarks,
  quotePayments,
  quotes,
  refunds,
  tourRequests,
} from "@/db";
import { formatDay } from "@/lib/date-keys";
import { bookingRef } from "@/lib/bookings";
import { listCatalogue } from "@/lib/experience-catalogue";
import {
  buildInvoiceEntries,
  type InvoiceEntry,
  type InvoiceMarkSource,
} from "@/lib/invoicing";
import { quoteRef } from "@/lib/quotes";

/**
 * Every line of "Para faturar", and every mark (JAM-528).
 *
 * All of it, not one day: the "Em atraso" list needs every past day, and the
 * volume is a few bookings a week. Read in one pass, then split in memory by
 * `splitInvoiceList`. A paid booking is one with a Stripe payment and a
 * confirmation. Payments outside Stripe (cash, transfer) are not here: the
 * platform does not know them.
 */
export async function readInvoicing(): Promise<{
  entries: InvoiceEntry[];
  marks: InvoiceMarkSource[];
}> {
  const [bookingRows, instalmentRows, refundRows, markRows, catalogue] = await Promise.all([
    db
      .select({
        id: bookings.id,
        paidAt: bookings.confirmedAt,
        amountCents: bookings.amountCents,
        currency: bookings.currency,
        refundedAmountCents: bookings.refundedAmountCents,
        refundedAt: bookings.refundedAt,
        date: bookings.date,
        experienceSlug: bookings.experienceSlug,
        leadId: bookings.tourRequestId,
        guestName: tourRequests.name,
        taxId: tourRequests.taxId,
      })
      .from(bookings)
      .leftJoin(tourRequests, eq(tourRequests.id, bookings.tourRequestId))
      .where(and(isNotNull(bookings.confirmedAt), isNotNull(bookings.stripePaymentIntentId))),
    db
      .select({
        id: quotePayments.id,
        kind: quotePayments.kind,
        paidAt: quotePayments.paidAt,
        amountCents: quotePayments.amountCents,
        currency: quotePayments.currency,
        refundedAmountCents: quotePayments.refundedAmountCents,
        refundedAt: quotePayments.refundedAt,
        quoteId: quotes.id,
        quoteTaxId: quotes.taxId,
        leadId: quotes.tourRequestId,
        guestName: tourRequests.name,
        leadTaxId: tourRequests.taxId,
      })
      .from(quotePayments)
      .innerJoin(quotes, eq(quotes.id, quotePayments.quoteId))
      .leftJoin(tourRequests, eq(tourRequests.id, quotes.tourRequestId))
      .where(isNotNull(quotePayments.paidAt)),
    db
      .select({
        id: refunds.id,
        bookingId: refunds.bookingId,
        quotePaymentId: refunds.quotePaymentId,
        amountCents: refunds.amountCents,
        refundedAt: refunds.refundedAt,
      })
      .from(refunds),
    db
      .select({
        entryKey: invoiceMarks.entryKey,
        documentNumber: invoiceMarks.documentNumber,
        markedAt: invoiceMarks.markedAt,
      })
      .from(invoiceMarks),
    listCatalogue(),
  ]);

  const titles = new Map(catalogue.map((entry) => [entry.slug, entry.title.pt]));
  // An erased lead leaves the money and loses the person (`set null`).
  const nameOf = (name: string | null) => name ?? "(dados apagados)";

  const entries = buildInvoiceEntries({
    bookings: bookingRows.map((row) => {
      const ref = bookingRef(row.id);
      const tour = titles.get(row.experienceSlug) ?? row.experienceSlug;
      return {
        id: row.id,
        ref,
        paidAt: row.paidAt!,
        amountCents: row.amountCents,
        currency: row.currency,
        refundedAmountCents: row.refundedAmountCents,
        refundedAt: row.refundedAt,
        guestName: nameOf(row.guestName),
        taxId: row.taxId,
        service: `${tour} · ${formatDay(row.date, "pt")} · ${ref}`,
        leadId: row.leadId,
      };
    }),
    instalments: instalmentRows.map((row) => {
      const ref = quoteRef(row.quoteId);
      return {
        id: row.id,
        ref,
        kind: row.kind,
        paidAt: row.paidAt!,
        amountCents: row.amountCents,
        currency: row.currency,
        refundedAmountCents: row.refundedAmountCents,
        refundedAt: row.refundedAt,
        guestName: nameOf(row.guestName),
        // The quote's own NIF wins: the couple typed it on the payment step.
        taxId: row.quoteTaxId ?? row.leadTaxId,
        service: `Orçamento ${ref}`,
        leadId: row.leadId,
      };
    }),
    refunds: refundRows,
  });

  return { entries, marks: markRows };
}
