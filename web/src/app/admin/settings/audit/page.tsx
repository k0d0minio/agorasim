import { redirect } from "next/navigation";
import { ScrollText } from "lucide-react";
import { count } from "drizzle-orm";
import { db, auditLog } from "@/db";
import { requireOwner } from "@/lib/admin-auth";
import { listAuditLog } from "@/lib/audit";
import { auditActionLabel, formatDateTime } from "@/lib/admin-format";
import { lastPage, pageSlice, readPageParam } from "@/lib/admin-pagination";
import { AdminShell } from "@/components/admin/admin-shell";
import { AdminPagination } from "@/components/admin/pagination";
import { PlaceholderPanel } from "@/components/admin/placeholder-panel";
import { Card } from "@/components/ui/card";

// Reads live data — never prerender at build time.
export const dynamic = "force-dynamic";

/**
 * The full audit trail. Owner-only.
 *
 * Entries are rendered from the stored `before`/`after` JSON as-is. Those
 * payloads are written by `lib/audit.ts` and are redacted of guest identifiers
 * at write time — the log is not a back door into data the erasure screen just
 * removed.
 */
export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  await requireOwner();

  const page = readPageParam((await searchParams).page);
  const { limit, offset } = pageSlice(page);

  const [[total], rows] = await Promise.all([
    db.select({ n: count() }).from(auditLog),
    listAuditLog({ limit, offset }),
  ]);

  const entries = total?.n ?? 0;
  if (entries > 0 && page > lastPage(entries)) {
    redirect(`/admin/settings/audit?page=${lastPage(entries)}`);
  }

  if (entries === 0) {
    return (
      <AdminShell>
        <PlaceholderPanel
          icon={ScrollText}
          title="Nothing recorded yet"
          description="Every change made in this admin — status updates, erasures, account changes — is recorded here with who made it and when."
        />
      </AdminShell>
    );
  }

  return (
    <AdminShell>
      <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
        <ScrollText className="size-4" />
        <span>
          {entries} {entries === 1 ? "entry" : "entries"}
        </span>
      </div>

      <Card className="divide-y p-0">
        {rows.map((row) => (
          <div key={row.id} className="flex flex-col gap-1 px-4 py-3">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-sm">
              <span className="font-medium">
                {/* A null actor means the retention cron, not an unknown person. */}
                {row.actorName ?? "Scheduled job"}
              </span>
              <span className="text-muted-foreground">{auditActionLabel(row.action)}</span>
              <span className="ml-auto whitespace-nowrap text-xs text-muted-foreground">
                {formatDateTime(row.createdAt)}
              </span>
            </div>

            <p className="text-xs text-muted-foreground">
              {row.entityType}
              {row.entityId ? ` · ${row.entityId}` : ""}
              {row.ipAddress ? ` · ${row.ipAddress}` : ""}
            </p>

            {row.before || row.after ? (
              <pre className="mt-1 overflow-x-auto rounded-lg bg-muted/50 px-3 py-2 text-[11px] leading-relaxed text-muted-foreground">
                {JSON.stringify({ before: row.before, after: row.after }, null, 2)}
              </pre>
            ) : null}
          </div>
        ))}
      </Card>

      <AdminPagination
        page={page}
        total={entries}
        label="Audit log pages"
        hrefFor={(n) => `/admin/settings/audit?page=${n}`}
      />
    </AdminShell>
  );
}
