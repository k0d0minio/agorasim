import Link from "next/link";
import { Clock } from "lucide-react";
import type { AuditLogRow } from "@/lib/audit";
import type { CatalogueEntry } from "@/lib/experience-catalogue";
import { groupByStage, type SalesRecord } from "@/lib/sales";
import { formatRelativeTime, requestStatusMeta } from "@/lib/admin-format";
import { Badge } from "@/components/ui/badge";
import { RecordIcons, ExperienceNames } from "@/components/admin/experience-icons";
import { RequestStatusSelect } from "@/components/admin/request-status-select";

/**
 * The Sales board: every lead and booking as a card, in the column its stage
 * says it belongs to.
 *
 * This is the CRM pipeline's layout, now over the real table rather than example
 * leads — which is what made three screens collapse into one. A card carries the
 * name, then what they asked for as icons, then the two facts triage actually
 * turns on: how old it is and what it's worth.
 *
 * Moving a card is the status picker on the card itself, on every screen size.
 * The preview's drag-and-drop was desktop-only and had a separate "move to…"
 * menu bolted on for touch; one control that works everywhere beats two that
 * each work somewhere.
 */
export function SalesBoard({
  records,
  catalogue,
  countsByStatus,
  lastChanged,
  now,
}: {
  records: SalesRecord[];
  catalogue: Map<string, CatalogueEntry>;
  countsByStatus: Record<string, number>;
  lastChanged: Map<string, AuditLogRow>;
  now: Date;
}) {
  const columns = groupByStage(records);

  return (
    <div className="-mx-4 px-4 pb-4 sm:-mx-6 sm:px-6 md:overflow-x-auto">
      <div className="flex flex-col gap-4 md:min-w-max md:snap-x md:snap-mandatory md:flex-row">
        {columns.map((column) => {
          const meta = requestStatusMeta[column.status];
          return (
            <section
              key={column.status}
              className="w-full rounded-xl border bg-muted/30 md:w-76 md:shrink-0 md:snap-start"
              aria-label={meta.label}
            >
              <header className="flex items-center justify-between gap-2 px-4 pt-4 pb-2">
                <div className="min-w-0">
                  <p className="font-heading text-sm font-semibold">{meta.label}</p>
                  <p className="truncate text-xs text-muted-foreground">{meta.hint}</p>
                </div>
                {/* The column total, not the filtered count — see `listSales`. */}
                <Badge variant="secondary">{countsByStatus[column.status] ?? 0}</Badge>
              </header>

              <div className="flex flex-col gap-2 p-3">
                {column.records.length === 0 ? (
                  <p className="px-1 pb-2 text-xs text-muted-foreground">Nothing here.</p>
                ) : null}

                {column.records.map((record) => (
                  <article
                    key={`${record.source}-${record.id}`}
                    className="rounded-lg border bg-card p-3 shadow-xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      {record.href ? (
                        <Link
                          href={record.href}
                          className="text-sm font-medium hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                        >
                          {record.name}
                        </Link>
                      ) : (
                        <p className="text-sm font-medium">{record.name}</p>
                      )}
                      {record.example ? <Badge variant="outline">Example</Badge> : null}
                    </div>

                    <RecordIcons record={record} catalogue={catalogue} className="mt-2" />

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
                          {record.partySize} {record.partySize === 1 ? "person" : "people"}
                        </span>
                      ) : null}
                      {record.when ? (
                        <span className="text-muted-foreground">{record.when}</span>
                      ) : null}
                      {record.example ? null : (
                        <span className="inline-flex items-center gap-1 text-muted-foreground">
                          <Clock className="size-3" aria-hidden />
                          {formatRelativeTime(record.createdAt, now)}
                        </span>
                      )}
                    </div>

                    {record.example ? null : (
                      <RequestStatusSelect
                        id={record.id}
                        status={record.status}
                        name={record.name}
                        className="mt-2"
                      />
                    )}

                    {lastChanged.get(record.id) ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {lastChanged.get(record.id)?.actorName ?? "Scheduled job"} ·{" "}
                        {formatRelativeTime(lastChanged.get(record.id)!.createdAt, now)}
                      </p>
                    ) : null}
                  </article>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
