import { Inbox, Search } from "lucide-react";
import { requireAdmin } from "@/lib/admin-auth";
import { lastAuditByEntity } from "@/lib/audit";
import { catalogueIndex, listCatalogue } from "@/lib/experience-catalogue";
import { countPendingRetention, retentionDays } from "@/lib/retention";
import { listSalesBoard } from "@/lib/sales";
import { AdminShell } from "@/components/admin/admin-shell";
import { Input } from "@/components/ui/input";
import { PlaceholderPanel } from "@/components/admin/placeholder-panel";
import { SalesBoard } from "@/components/admin/sales-board";
import { SalesSearchResults } from "@/components/admin/sales-search-results";
import { SubjectExportForm } from "@/components/admin/subject-export-form";

// Reads live data — never prerender at build time.
export const dynamic = "force-dynamic";

/**
 * Sales — every enquiry and every booking, on one board.
 *
 * This screen replaces three: Submissions (a table of website enquiries), the
 * CRM pipeline (a board of example leads) and Bookings (a table of example
 * bookings). All three mocks are gone with them — every card here is a lead
 * somebody actually sent. For a while it kept a table view and a row of filters
 * as well, and the result was one screen wearing three toolbars. The board won:
 * the columns *are* the status filter, triage is the daily job, and everything
 * the table did that the board doesn't lives on a card's own detail page.
 *
 * Each column holds its newest records up to a bound (see `SALES_STAGE_LIMIT`)
 * while its header shows the true total — a full column is visibly capped, not
 * quietly wrong. A search (`?q=`) is the way past the cap: matches are served
 * server-side against name, e-mail and phone across every stage, and shown as
 * one flat list with the count.
 */
export default async function AdminSalesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = q?.trim();

  // Every operator can triage; only owners can export guest data below.
  const viewer = await requireAdmin();
  const isOwner = viewer.role === "owner";

  const [{ records, totalEnquiries, countsByStatus }, catalogue] =
    await Promise.all([listSalesBoard(query), listCatalogue()]);

  const [lastChanged, pendingRetention] = await Promise.all([
    // One query for the whole page's "last changed by" lines, not one per row.
    lastAuditByEntity(
      "tour_request",
      records.map((record) => record.id),
    ),
    countPendingRetention(),
  ]);

  const now = new Date();
  const index = catalogueIndex(catalogue);
  const countLabel = `${totalEnquiries} ${totalEnquiries === 1 ? "pedido" : "pedidos"}`;

  return (
    <AdminShell>
      {/*
        Lead lookup — "where is that couple's enquiry?". No query shows the
        board; any query searches every lead, reaching past the per-stage cap.
      */}
      <form method="get" className="mb-6">
        <label htmlFor="sales-search" className="text-sm font-medium">
          Procurar pedidos
        </label>
        <div className="relative mt-1.5 max-w-md">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            id="sales-search"
            name="q"
            type="search"
            defaultValue={query}
            placeholder="Nome, e-mail ou telefone"
            className="pl-9"
          />
        </div>
      </form>

      {query ? (
        <SalesSearchResults
          records={records}
          query={query}
          catalogue={index}
          lastChanged={lastChanged}
          now={now}
        />
      ) : records.length === 0 ? (
        <PlaceholderPanel
          icon={Inbox}
          title="Ainda não há pedidos"
          description="Quando alguém preencher o formulário do site, o pedido aparece aqui como cartão no quadro."
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

      <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {query ? null : (
          <span className="flex items-center gap-1.5">
            <Inbox className="size-3.5" />
            {countLabel}
          </span>
        )}
        {/* The retention policy, made visible. A scheduled job that quietly
            erases data nobody knew was scheduled to go is how surprises happen. */}
        <span>
          Os pedidos que não deram reserva são anonimizados ao fim de {retentionDays()} dias
          {pendingRetention > 0 ? ` · ${pendingRetention} na próxima limpeza` : ""}
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
