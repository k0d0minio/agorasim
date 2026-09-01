import Link from "next/link";
import { Clock, Search } from "lucide-react";
import type { AuditLogRow } from "@/lib/audit";
import type { CatalogueEntry } from "@/lib/experience-catalogue";
import { formatRelativeTime, requestStatusMeta } from "@/lib/admin-format";
import type { SalesRecord } from "@/lib/sales";
import { Badge } from "@/components/ui/badge";
import { ExperienceNames, RecordIcons } from "@/components/admin/experience-icons";
import { PlaceholderPanel } from "@/components/admin/placeholder-panel";

/**
 * Lead search results on the Sales board: what a `q` query matched, as the
 * same cards the board renders but one flat list across every stage, capped at
 * nothing — a query reaches the 51st `booked` lead the board itself cannot.
 *
 * A result has no column header left to say where the lead lives, so the status
 * badge that the board implies by position is drawn on the card instead. The
 * matched contact details ride along too: a query is usually standing in for
 * "which line do I quote back to them?".
 */
export function SalesSearchResults({
  records,
  query,
  catalogue,
  lastChanged,
  now,
}: {
  records: SalesRecord[];
  query: string;
  catalogue: Map<string, CatalogueEntry>;
  lastChanged: Map<string, AuditLogRow>;
  now: Date;
}) {
  if (records.length === 0) {
    return (
      <PlaceholderPanel
        icon={Search}
        title="Sem resultados"
        description={`Nenhum pedido corresponde a “${query}”. Procure por nome, e-mail ou número de telefone.`}
      />
    );
  }

  return (
    <>
      <p className="mb-3 text-sm text-muted-foreground" role="status">
        {records.length} {records.length === 1 ? "resultado para" : "resultados para"}{" "}
        “{query}”
      </p>

      <ul className="flex flex-col gap-2">
        {records.map((record) => {
          const status = requestStatusMeta[record.status];
          const contact = [record.email, record.phone].filter(Boolean).join(" · ");
          return (
            <li key={record.id}>
              <article className="rounded-lg border bg-card p-3 shadow-xs">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <Link
                      href={record.href}
                      className="inline-flex min-h-11 items-center text-sm font-medium hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                    >
                      {record.name}
                    </Link>
                    {record.bookingRef ? (
                      <p className="font-mono text-xs text-muted-foreground">
                        {record.bookingRef}
                      </p>
                    ) : null}
                  </div>
                  <Badge variant={status.variant}>{status.label}</Badge>
                </div>

                {contact ? (
                  <p className="mt-1 text-xs text-muted-foreground">{contact}</p>
                ) : null}

                <RecordIcons record={record} catalogue={catalogue} className="mt-1" />

                <ExperienceNames
                  experienceSlug={record.experienceSlug}
                  addOns={record.addOns}
                  catalogue={catalogue}
                  className="mt-1.5 block text-xs text-muted-foreground"
                />

                <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                  {record.value ? (
                    <span className="font-semibold text-primary">{record.value}</span>
                  ) : null}
                  {record.partySize ? (
                    <span className="text-muted-foreground">
                      {record.partySize} {record.partySize === 1 ? "pessoa" : "pessoas"}
                    </span>
                  ) : null}
                  {record.when ? (
                    <span className="text-muted-foreground">{record.when}</span>
                  ) : null}
                  <span className="inline-flex items-center gap-1 text-muted-foreground">
                    <Clock className="size-3" aria-hidden />
                    {formatRelativeTime(record.createdAt, now)}
                  </span>
                </div>

                {lastChanged.get(record.id) ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {lastChanged.get(record.id)?.actorName ?? "Tarefa automática"} ·{" "}
                    {formatRelativeTime(lastChanged.get(record.id)!.createdAt, now)}
                  </p>
                ) : null}
              </article>
            </li>
          );
        })}
      </ul>
    </>
  );
}