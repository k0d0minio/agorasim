import Link from "next/link";
import { Clock, MapPin } from "lucide-react";
import type { AuditLogRow } from "@/lib/audit";
import type { CatalogueEntry } from "@/lib/experience-catalogue";
import { manualBookingPrefill } from "@/lib/manual-booking";
import { groupByStage, type SalesRecord } from "@/lib/sales";
import { formatRelativeTime, requestStatusMeta } from "@/lib/admin-format";
import { Badge } from "@/components/ui/badge";
import { RecordIcons, ExperienceNames } from "@/components/admin/experience-icons";
import { LeadManualBooking } from "@/components/admin/lead-manual-booking";
import type {
  ManualBookingDay,
  ManualBookingTour,
} from "@/components/admin/manual-booking-dialog";
import { RequestStatusSelect } from "@/components/admin/request-status-select";
import { SalesStagePager } from "@/components/admin/sales-stage-pager";

/**
 * The stages whose cards offer "Registar reserva".
 *
 * A lead still in play, in other words. `booked` has already converted and its
 * card carries the money; `archived` was deliberately put away, and an action
 * that would quietly reopen it as a sale does not belong on the card. Both can
 * still be booked from the lead's own page, which is where a deliberate
 * exception goes.
 */
const BOOKABLE_STAGES = new Set(["new", "contacted", "quoted"]);

/**
 * The Sales board: every lead and booking as a card, in the column its stage
 * says it belongs to.
 *
 * This is the CRM pipeline's layout, now over the real table rather than example
 * leads — which is what made three screens collapse into one. A card carries the
 * name, then what they asked for as icons, then the two facts triage actually
 * turns on: how old it is and what it's worth.
 *
 * On a phone the columns are pages of a swipeable stage pager — see
 * `SalesStagePager` for why. Moving a card is the status picker on the card
 * itself, on every screen size: the preview's drag-and-drop was desktop-only
 * and had a separate "move to…" menu bolted on for touch; one control that
 * works everywhere beats two that each work somewhere.
 */
export function SalesBoard({
  records,
  catalogue,
  countsByStatus,
  lastChanged,
  now,
  openDays,
  tours,
}: {
  records: SalesRecord[];
  catalogue: Map<string, CatalogueEntry>;
  countsByStatus: Record<string, number>;
  lastChanged: Map<string, AuditLogRow>;
  now: Date;
  /**
   * The departures the phone-booking sheet can sell, read once for the whole
   * board. Every card hands the same array to its own sheet — one read and one
   * copy in the payload, rather than fifty of each.
   */
  openDays: ManualBookingDay[];
  tours: ManualBookingTour[];
}) {
  const columns = groupByStage(records);

  const stages = columns.map((column) => {
    const meta = requestStatusMeta[column.status];
    return {
      key: column.status,
      label: meta.label,
      // The true stage total, not how many cards were fetched — a column
      // capped at `SALES_STAGE_LIMIT` says so instead of quietly
      // undercounting. See `listSalesBoard`.
      count: countsByStatus[column.status] ?? 0,
      content: (
        <section
          className="flex min-h-40 flex-col rounded-xl border bg-muted/30"
          aria-label={meta.label}
        >
          <header className="flex items-center justify-between gap-2 px-4 pt-4 pb-2">
            <div className="min-w-0">
              <p className="font-heading text-sm font-semibold">{meta.label}</p>
              {/*
                Wraps rather than truncates. The stage hint is prose, and F3
                allows truncation only on identifiers whose full value is
                somewhere else — this one is nowhere else. It also no longer
                fits: "Sem resposta — ainda ninguém respondeu" measures 234px
                against exactly 234px of column header at 375px and clips at
                the 320px floor, where the English "Untouched — nobody has
                replied yet" had room to spare.
              */}
              <p className="text-xs leading-tight text-muted-foreground">{meta.hint}</p>
            </div>
            <Badge variant="secondary">{countsByStatus[column.status] ?? 0}</Badge>
          </header>

          <div className="flex flex-col gap-2 p-3">
            {column.records.length === 0 ? (
              <p className="px-1 pb-2 text-sm text-muted-foreground">
                {/* The stage name keeps its capital: `Novo`, `Orçamentado` and the
                    rest are the column's name here, not adjectives in a sentence. */}
                Nada em {meta.label} de momento.
              </p>
            ) : null}

            {column.records.map((record) => (
              <article
                key={record.id}
                className="rounded-lg border bg-card p-3 shadow-xs"
              >
                <Link
                  href={record.href}
                  // The card's way in — a full-height touch row, not a
                  // text-sized sliver (spec §2 T1).
                  className="inline-flex min-h-11 items-center text-sm font-medium hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                >
                  {record.name}
                </Link>

                {/*
                  The reference the guest is holding. Theirs comes from the
                  booking, the team's from the lead, and they are different
                  uuids — so a card that never showed this one could not be
                  found by somebody quoting it down the phone.
                */}
                {record.bookingRef ? (
                  <p className="font-mono text-xs text-muted-foreground">{record.bookingRef}</p>
                ) : null}

                <RecordIcons record={record} catalogue={catalogue} className="mt-1" />

                <ExperienceNames
                  experienceSlug={record.experienceSlug}
                  addOns={record.addOns}
                  catalogue={catalogue}
                  className="mt-1.5 block text-xs text-muted-foreground"
                />

                {/*
                  Where a wedding or an event happens. Its own line rather than
                  another chip in the row below: a venue is an address, not a
                  fact of two words, and the date beside it in that row is what
                  the two are read together as. Tours carry none.
                */}
                {record.venue ? (
                  <p className="mt-1.5 flex items-start gap-1 text-xs text-muted-foreground">
                    <MapPin className="mt-0.5 size-3 shrink-0" aria-hidden />
                    <span>{record.venue}</span>
                  </p>
                ) : null}

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

                <RequestStatusSelect
                  id={record.id}
                  status={record.status}
                  name={record.name}
                  className="mt-1"
                />

                {/*
                  Rita's phone call, answered where it landed: this turns the
                  enquiry into a confirmed booking without the Calendar detour,
                  and moves the card into `Reservado` as it does. Not on an
                  anonymised lead — the person it would be for has been erased.
                */}
                {BOOKABLE_STAGES.has(record.status) && !record.anonymisedAt ? (
                  <LeadManualBooking
                    lead={manualBookingPrefill(record, tours)}
                    days={openDays}
                    tours={tours}
                    className="mt-2 w-full gap-2"
                  />
                ) : null}

                {lastChanged.get(record.id) ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {lastChanged.get(record.id)?.actorName ?? "Tarefa automática"} ·{" "}
                    {formatRelativeTime(lastChanged.get(record.id)!.createdAt, now)}
                  </p>
                ) : null}
              </article>
            ))}
          </div>
        </section>
      ),
    };
  });

  return <SalesStagePager stages={stages} />;
}
