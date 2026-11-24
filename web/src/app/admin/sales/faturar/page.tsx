import Link from "next/link";
import { AlertTriangle, ChevronLeft, ChevronRight } from "lucide-react";

import { AdminShell } from "@/components/admin/admin-shell";
import { InvoiceMarkForm } from "@/components/admin/invoice-mark-form";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { requireAdmin } from "@/lib/admin-auth";
import { addDays, formatDay, isDateKey, todayKey } from "@/lib/date-keys";
import { splitInvoiceList, type MarkedEntry } from "@/lib/invoicing";
import { readInvoicing } from "@/lib/invoicing-read";
import { formatPrice } from "@/lib/money";

// Reads live data — never prerender at build time.
export const dynamic = "force-dynamic";

const KIND_LABELS: Record<MarkedEntry["kind"], string> = {
  booking: "Reserva",
  deposit: "Sinal",
  balance: "Saldo",
  other: "Pagamento",
  refund: "Reembolso",
};

const TIME = new Intl.DateTimeFormat("pt-PT", {
  timeZone: "Europe/Lisbon",
  hour: "2-digit",
  minute: "2-digit",
});

/**
 * "Para faturar" (JAM-528): each payment and each refund of one day, with the
 * fields of its fatura or nota de crédito, and a mark "Fatura emitida" with the
 * document number.
 *
 * Faturas are issued by hand at go-live (`.icm/docs/go-live-legal.md`). This
 * page is the work list of the person who issues them. Above the chosen day,
 * "Em atraso" lists each line of a past day with no mark, the oldest first, so
 * a missed fatura cannot hide on a day nobody opens.
 *
 * `?dia=AAAA-MM-DD` picks the day. Today by default, in Europe/Lisbon.
 */
export default async function InvoicingPage({
  searchParams,
}: {
  searchParams: Promise<{ dia?: string }>;
}) {
  await requireAdmin();
  const { dia } = await searchParams;
  const today = todayKey();
  const day = dia && isDateKey(dia) ? dia : today;

  const { entries, marks } = await readInvoicing();
  const list = splitInvoiceList(entries, marks, { day, today });

  return (
    <AdminShell>
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <header className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold">Para faturar</h1>
          <p className="text-sm text-muted-foreground">
            Cada pagamento precisa de uma fatura na data do pagamento, e cada reembolso de uma
            nota de crédito. Emita o documento no seu programa e marque a linha com o número.
          </p>
        </header>

        {list.overdue.length > 0 ? (
          <section
            aria-labelledby="em-atraso"
            className="flex flex-col gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30"
          >
            <h2 id="em-atraso" className="flex items-center gap-2 font-semibold">
              <AlertTriangle className="size-4" />
              Em atraso ({list.overdue.length})
            </h2>
            <p className="text-sm text-muted-foreground">
              Linhas de dias passados sem fatura marcada, a mais antiga primeiro.
            </p>
            <EntryList entries={list.overdue} showDay />
          </section>
        ) : null}

        <section aria-labelledby="dia" className="flex flex-col gap-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 id="dia" className="font-semibold">
              {formatDay(day, "pt")}
              {day === today ? " · hoje" : ""}
            </h2>
            <div className="flex items-center gap-2">
              <Link
                href={`/admin/sales/faturar?dia=${addDays(day, -1)}`}
                className={buttonVariants({ variant: "outline", size: "icon" })}
                aria-label="Dia anterior"
              >
                <ChevronLeft className="size-4" />
              </Link>
              <form method="get" className="flex items-center gap-2">
                <label htmlFor="dia-input" className="sr-only">
                  Escolher o dia
                </label>
                <Input id="dia-input" type="date" name="dia" defaultValue={day} className="w-auto" />
                <button type="submit" className={buttonVariants({ variant: "outline" })}>
                  Ver
                </button>
              </form>
              <Link
                href={`/admin/sales/faturar?dia=${addDays(day, 1)}`}
                className={buttonVariants({ variant: "outline", size: "icon" })}
                aria-label="Dia seguinte"
              >
                <ChevronRight className="size-4" />
              </Link>
            </div>
          </div>
          {list.day.length > 0 ? (
            <EntryList entries={list.day} />
          ) : (
            <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
              Nenhum pagamento nem reembolso neste dia.
            </p>
          )}
        </section>
      </div>
    </AdminShell>
  );
}

function EntryList({ entries, showDay = false }: { entries: MarkedEntry[]; showDay?: boolean }) {
  return (
    <ul className="flex flex-col gap-3">
      {entries.map((entry) => {
        const isRefund = entry.kind === "refund";
        return (
          <li key={entry.key} className="flex flex-col gap-3 rounded-xl border bg-background p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {KIND_LABELS[entry.kind]} ·{" "}
                  {showDay ? `${formatDay(entry.day, "pt")} ` : ""}
                  {TIME.format(entry.at)}
                </p>
                <p className="font-medium">
                  {entry.leadId ? (
                    <Link href={`/admin/sales/${entry.leadId}`} className="hover:underline">
                      {entry.guestName}
                    </Link>
                  ) : (
                    entry.guestName
                  )}
                </p>
              </div>
              <p className={isRefund ? "font-semibold text-destructive" : "font-semibold"}>
                {isRefund ? "−" : ""}
                {formatPrice(entry.amountCents, "pt", entry.currency)}
              </p>
            </div>
            <dl className="grid gap-x-4 gap-y-1 text-sm sm:grid-cols-[auto_1fr]">
              <dt className="text-muted-foreground">NIF</dt>
              <dd className="break-all">{entry.taxId ?? "— (sem NIF)"}</dd>
              <dt className="text-muted-foreground">Serviço</dt>
              <dd>{entry.service}</dd>
            </dl>
            <InvoiceMarkForm
              entryKey={entry.key}
              documentNumber={entry.documentNumber}
              isRefund={isRefund}
            />
          </li>
        );
      })}
    </ul>
  );
}
