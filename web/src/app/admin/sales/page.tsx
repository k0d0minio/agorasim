import { redirect } from "next/navigation";
import { Inbox } from "lucide-react";
import { requireAdmin } from "@/lib/admin-auth";
import { lastAuditByEntity } from "@/lib/audit";
import { catalogueIndex, listCatalogue } from "@/lib/experience-catalogue";
import { countPendingRetention, retentionDays } from "@/lib/retention";
import {
  listSales,
  readSourceFilter,
  readStatusFilter,
  readView,
  salesHref,
} from "@/lib/sales";
import { lastPage, pageSlice, readPageParam } from "@/lib/admin-pagination";
import { AdminShell } from "@/components/admin/admin-shell";
import { AdminPagination } from "@/components/admin/pagination";
import { BulkSubmissionActions } from "@/components/admin/bulk-submission-actions";
import { PlaceholderPanel } from "@/components/admin/placeholder-panel";
import { SalesBoard } from "@/components/admin/sales-board";
import { SalesTable } from "@/components/admin/sales-table";
import { SalesToolbar } from "@/components/admin/sales-filters";
import { SubjectExportForm } from "@/components/admin/subject-export-form";

// Reads live data — never prerender at build time.
export const dynamic = "force-dynamic";

/**
 * Sales — every enquiry and every booking, in one place.
 *
 * This screen replaces three: Submissions (a table of website enquiries), the
 * CRM pipeline (a board of example leads) and Bookings (a table of example
 * bookings). They were three views of substantially one dataset, each with its
 * own layout, its own words for the same lifecycle, and no way to see the whole
 * week at once. `lib/sales.ts` is the join; this page is the two views over it,
 * chosen by a link.
 *
 * The board is the default because triage is the daily job. The table is the
 * bookings layout — reference, guest, date, what, party, value, stage — applied
 * to every row, with the long text that used to fill it replaced by the
 * catalogue's iconography and a detail page one tap away.
 */
export default async function AdminSalesPage({
  searchParams,
}: {
  searchParams: Promise<{
    view?: string;
    source?: string;
    status?: string;
    page?: string;
  }>;
}) {
  // Every operator can triage; only owners can erase or export guest data.
  const viewer = await requireAdmin();
  const isOwner = viewer.role === "owner";

  const params = await searchParams;
  const view = readView(params.view);
  const filters = {
    source: readSourceFilter(params.source),
    status: readStatusFilter(params.status),
  };
  const page = readPageParam(params.page);
  const { limit, offset } = pageSlice(page);

  const [{ records, totalEnquiries, exampleCount, countsByStatus }, catalogue] =
    await Promise.all([listSales({ limit, offset, filters }), listCatalogue()]);

  // A hand-typed page past the end — send them to the last real one.
  if (totalEnquiries > 0 && page > lastPage(totalEnquiries)) {
    redirect(salesHref({ view, filters }, { page: lastPage(totalEnquiries) }));
  }

  const [lastChanged, pendingRetention] = await Promise.all([
    // One query for the whole page's "last changed by" lines, not one per row.
    lastAuditByEntity(
      "tour_request",
      records.filter((record) => !record.example).map((record) => record.id),
    ),
    countPendingRetention(),
  ]);

  const now = new Date();
  const index = catalogueIndex(catalogue);
  const countLabel = `${totalEnquiries} ${totalEnquiries === 1 ? "enquiry" : "enquiries"}`;

  const empty = records.length === 0;

  return (
    <AdminShell>
      <SalesToolbar
        view={view}
        filters={filters}
        countsByStatus={countsByStatus}
        exampleCount={exampleCount}
      />

      {empty ? (
        <PlaceholderPanel
          icon={Inbox}
          title={
            filters.status || filters.source !== "all"
              ? "Nothing matches that filter"
              : "No leads yet"
          }
          description={
            filters.status || filters.source !== "all"
              ? "Clear the filters above to see everything again."
              : "Once customers submit the booking form, their enquiries appear here — as cards on the board and as rows in the table."
          }
        />
      ) : view === "board" ? (
        <SalesBoard
          records={records}
          catalogue={index}
          countsByStatus={countsByStatus}
          lastChanged={lastChanged}
          now={now}
        />
      ) : (
        /* Bulk archive and bulk erase belong to the table, which is where the
           row checkboxes are. Wrapping the board in them too would render a
           toolbar asking the operator to tick rows that have no checkbox. */
        <BulkSubmissionActions canErase={isOwner}>
          <SalesTable
            records={records}
            catalogue={index}
            lastChanged={lastChanged}
            now={now}
            caption={`Enquiries and bookings, newest first — ${countLabel}.`}
          />
        </BulkSubmissionActions>
      )}

      <AdminPagination
        page={page}
        total={totalEnquiries}
        label="Sales pages"
        hrefFor={(n) => salesHref({ view, filters }, { page: n })}
      />

      <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <Inbox className="size-3.5" />
          {countLabel}
        </span>
        {/* The retention policy, made visible. A scheduled job that quietly
            erases data nobody knew was scheduled to go is how surprises happen. */}
        <span>
          Unconverted enquiries are anonymised after {retentionDays()} days
          {pendingRetention > 0 ? ` · ${pendingRetention} due at the next run` : ""}
        </span>
      </div>

      {/* Owner-only, because a subject-access export is a bulk read of guest
          PII — exactly what a collaborator account is not for. */}
      {isOwner ? (
        <div className="mt-8">
          <SubjectExportForm />
        </div>
      ) : null}
    </AdminShell>
  );
}
