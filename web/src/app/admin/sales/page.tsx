import { Inbox } from "lucide-react";
import { requireAdmin } from "@/lib/admin-auth";
import { lastAuditByEntity } from "@/lib/audit";
import { catalogueIndex, listCatalogue } from "@/lib/experience-catalogue";
import { countPendingRetention, retentionDays } from "@/lib/retention";
import { listSalesBoard } from "@/lib/sales";
import { AdminShell } from "@/components/admin/admin-shell";
import { PlaceholderPanel } from "@/components/admin/placeholder-panel";
import { SalesBoard } from "@/components/admin/sales-board";
import { SubjectExportForm } from "@/components/admin/subject-export-form";

// Reads live data — never prerender at build time.
export const dynamic = "force-dynamic";

/**
 * Sales — every enquiry and every booking, on one board.
 *
 * This screen replaces three: Submissions (a table of website enquiries), the
 * CRM pipeline (a board of example leads) and Bookings (a table of example
 * bookings). For a while it kept a table view and a row of filters as well,
 * and the result was one screen wearing three toolbars. The board won: the
 * columns *are* the status filter, triage is the daily job, and everything the
 * table did that the board doesn't lives on a card's own detail page.
 *
 * Each column holds its newest records up to a bound (see `SALES_STAGE_LIMIT`)
 * while its header shows the true total — a full column is visibly capped, not
 * quietly wrong.
 */
export default async function AdminSalesPage() {
  // Every operator can triage; only owners can export guest data below.
  const viewer = await requireAdmin();
  const isOwner = viewer.role === "owner";

  const [{ records, totalEnquiries, exampleCount, countsByStatus }, catalogue] =
    await Promise.all([listSalesBoard(), listCatalogue()]);

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

  return (
    <AdminShell>
      {records.length === 0 ? (
        <PlaceholderPanel
          icon={Inbox}
          title="No leads yet"
          description="Once customers submit the booking form, their enquiries appear here as cards on the board."
        />
      ) : (
        <SalesBoard
          records={records}
          catalogue={index}
          countsByStatus={countsByStatus}
          lastChanged={lastChanged}
          now={now}
        />
      )}

      {exampleCount > 0 ? (
        <p className="mt-4 text-xs text-muted-foreground">
          {exampleCount} card{exampleCount === 1 ? "" : "s"} marked{" "}
          <span className="font-medium">Example</span> are placeholder bookings — real ones
          appear here the moment instant booking and payments go live.
        </p>
      ) : null}

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
