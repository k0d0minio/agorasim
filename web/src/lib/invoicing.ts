/**
 * "Para faturar" (JAM-528): each payment and each refund that needs a fatura or
 * a nota de crédito, by day.
 *
 * Faturas are issued by hand at go-live (`.icm/docs/go-live-legal.md`, the
 * fatura decision). Each successful payment needs a fatura on the date of the
 * payment, and each refund a nota de crédito (CIVA art. 29.º n.º 1 b), art. 36.º
 * n.º 1 c)). This module turns the payment rows into those lines, and splits
 * them into the chosen day and the lines of past days that have no mark.
 *
 * Pure on purpose: the reads are in `lib/invoicing-read.ts`, so the rules here
 * are tested without a database.
 */

import { todayKey, type DateKey } from "@/lib/date-keys";

/** What a line is: the kind of payment, or a refund. */
export type InvoiceEntryKind = "booking" | "deposit" | "balance" | "other" | "refund";

/** One line of "Para faturar": the fields of the fatura. */
export type InvoiceEntry = {
  /** The key of its mark in `invoice_marks` (see `db/schema.ts`). */
  key: string;
  kind: InvoiceEntryKind;
  /** When the money moved. */
  at: Date;
  /** `at` as a day in Europe/Lisbon: the date of the document. */
  day: DateKey;
  guestName: string;
  /** The NIF the guest gave (JAM-527), or null. */
  taxId: string | null;
  /** What was sold, in Portuguese, for the document's description. */
  service: string;
  /** Always positive. A refund's line says "Reembolso". */
  amountCents: number;
  currency: string;
  /** The lead on the Sales board, for the link. Null when the lead was erased. */
  leadId: string | null;
};

/** A paid tour booking, as `lib/invoicing-read.ts` reads it. */
export type PaidBookingSource = {
  id: string;
  ref: string;
  paidAt: Date;
  amountCents: number;
  currency: string;
  refundedAmountCents: number;
  refundedAt: Date | null;
  guestName: string;
  taxId: string | null;
  service: string;
  leadId: string | null;
};

/** A paid instalment of a quote. */
export type PaidInstalmentSource = PaidBookingSource & {
  kind: "deposit" | "balance" | "other";
};

/** One row of the `refunds` ledger. */
export type RefundSource = {
  id: string;
  bookingId: string | null;
  quotePaymentId: string | null;
  amountCents: number;
  refundedAt: Date;
};

export type InvoiceSources = {
  bookings: PaidBookingSource[];
  instalments: PaidInstalmentSource[];
  refunds: RefundSource[];
};

const INSTALMENT_NAMES: Record<PaidInstalmentSource["kind"], string> = {
  deposit: "Sinal",
  balance: "Saldo",
  other: "Pagamento",
};

/**
 * Every line, from the payment rows and the refund ledger.
 *
 * A refund from before the ledger existed has no ledger row. It shows once, as
 * a "legacy" line: the part of the refunded total that the ledger does not
 * explain, on the date of the payment row's last refund — or on the date of
 * the first ledger row, when a later refund overwrote that date.
 */
export function buildInvoiceEntries(sources: InvoiceSources): InvoiceEntry[] {
  const entries: InvoiceEntry[] = [];

  const payments: {
    source: PaidBookingSource;
    keyBase: string;
    kind: InvoiceEntryKind;
    service: string;
  }[] = [
    ...sources.bookings.map((source) => ({
      source,
      keyBase: `booking:${source.id}`,
      kind: "booking" as const,
      service: source.service,
    })),
    ...sources.instalments.map((source) => ({
      source,
      keyBase: `quote-payment:${source.id}`,
      kind: source.kind,
      service: `${source.service} · ${INSTALMENT_NAMES[source.kind]}`,
    })),
  ];

  for (const { source, keyBase, kind, service } of payments) {
    const base = {
      guestName: source.guestName,
      taxId: source.taxId,
      currency: source.currency,
      leadId: source.leadId,
    };
    entries.push({
      ...base,
      key: keyBase,
      kind,
      at: source.paidAt,
      day: todayKey(source.paidAt),
      service,
      amountCents: source.amountCents,
    });

    const ledger = sources.refunds
      .filter((refund) =>
        kind === "booking"
          ? refund.bookingId === source.id
          : refund.quotePaymentId === source.id,
      )
      .sort((a, b) => a.refundedAt.getTime() - b.refundedAt.getTime());

    for (const refund of ledger) {
      entries.push({
        ...base,
        key: `refund:${refund.id}`,
        kind: "refund",
        at: refund.refundedAt,
        day: todayKey(refund.refundedAt),
        service: `Reembolso · ${service}`,
        amountCents: refund.amountCents,
      });
    }

    const explained = ledger.reduce((sum, refund) => sum + refund.amountCents, 0);
    const legacyCents = source.refundedAmountCents - explained;
    const legacyAt = ledger[0]?.refundedAt ?? source.refundedAt;
    if (legacyCents > 0 && legacyAt) {
      entries.push({
        ...base,
        key: `legacy-refund:${keyBase}`,
        kind: "refund",
        at: legacyAt,
        day: todayKey(legacyAt),
        service: `Reembolso · ${service}`,
        amountCents: legacyCents,
      });
    }
  }

  return entries.sort((a, b) => a.at.getTime() - b.at.getTime());
}

/** A line with its mark, when it has one. */
export type MarkedEntry = InvoiceEntry & {
  documentNumber: string | null;
  markedAt: Date | null;
};

export type InvoiceMarkSource = { entryKey: string; documentNumber: string; markedAt: Date };

/**
 * The page's two lists: the lines of the chosen day, and above them the lines
 * of past days with no mark ("Em atraso"), the oldest first.
 *
 * A past day is a day before today in Europe/Lisbon. Today's unmarked lines
 * are not late: the fatura is due on the date of the payment, and that date is
 * not over yet.
 */
export function splitInvoiceList(
  entries: InvoiceEntry[],
  marks: InvoiceMarkSource[],
  options: { day: DateKey; today: DateKey },
): { day: MarkedEntry[]; overdue: MarkedEntry[] } {
  const byKey = new Map(marks.map((mark) => [mark.entryKey, mark]));
  const marked: MarkedEntry[] = entries.map((entry) => {
    const mark = byKey.get(entry.key);
    return {
      ...entry,
      documentNumber: mark?.documentNumber ?? null,
      markedAt: mark?.markedAt ?? null,
    };
  });
  return {
    day: marked.filter((entry) => entry.day === options.day),
    overdue: marked.filter((entry) => entry.documentNumber === null && entry.day < options.today),
  };
}

/** The shape of a mark key, so a posted form cannot write any other text. */
export const INVOICE_ENTRY_KEY_RE =
  /^(?:booking|quote-payment|refund|legacy-refund:(?:booking|quote-payment)):[0-9a-f-]{36}$/;
