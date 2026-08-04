import { redirect } from "next/navigation";
import { Lightbulb } from "lucide-react";
import { count, desc, eq } from "drizzle-orm";
import { db, featureRequests, adminUsers } from "@/db";
import { requireAdmin } from "@/lib/admin-auth";
import { lastAuditByEntity } from "@/lib/audit";
import { AdminShell } from "@/components/admin/admin-shell";
import { FeatureRequestForm } from "@/components/admin/feature-request-form";
import { FeatureRequestStatusSelect } from "@/components/admin/feature-request-status-select";
import { AdminPagination } from "@/components/admin/pagination";
import { lastPage, pageSlice, readPageParam } from "@/lib/admin-pagination";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  auditActionLabel,
  formatDateTime,
  formatRelativeTime,
  featureRequestPriorityMeta,
} from "@/lib/admin-format";

// Reads live data — never prerender at build time.
export const dynamic = "force-dynamic";

/**
 * Feature requests — a form and a list, and nothing else.
 *
 * This page used to open with a priced catalogue of the build proposal: nine
 * features with summaries and euro amounts, and a picker that filed a request
 * per selection. That was a sales surface, and it made sense while the scope of
 * the work was still being agreed. The contract is signed, so it is gone —
 * along with `lib/proposal.ts` and the action behind it. What is left is the
 * thing the team actually needs day to day: somewhere to write down an idea.
 */
export default async function AdminFeatureRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  await requireAdmin();

  const page = readPageParam((await searchParams).page);
  const { limit, offset } = pageSlice(page);

  const [[total], rows] = await db.batch([
    db.select({ n: count() }).from(featureRequests),
    db
      .select({
        id: featureRequests.id,
        title: featureRequests.title,
        description: featureRequests.description,
        category: featureRequests.category,
        priority: featureRequests.priority,
        status: featureRequests.status,
        createdAt: featureRequests.createdAt,
        // Who raised it: the account today, the old free-text name for rows
        // that predate accounts. Neither is authoritative over the other —
        // legacy rows genuinely only have the string.
        submittedByName: adminUsers.name,
        submittedByLegacy: featureRequests.submittedByLegacy,
      })
      .from(featureRequests)
      .leftJoin(adminUsers, eq(featureRequests.submittedByUserId, adminUsers.id))
      .orderBy(desc(featureRequests.createdAt))
      .limit(limit)
      .offset(offset),
  ]);

  const requests = total?.n ?? 0;
  if (requests > 0 && page > lastPage(requests)) {
    redirect(`/admin/feature-requests?page=${lastPage(requests)}`);
  }

  // One query for the whole page's "last changed by" lines, not one per row.
  const lastChanged = await lastAuditByEntity(
    "feature_request",
    rows.map((r) => r.id),
  );
  const now = new Date();

  return (
    <AdminShell>
      <div className="flex flex-col gap-8">
        <FeatureRequestForm />

        <section className="flex flex-col gap-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Lightbulb className="size-4" />
            <span>
              {requests} {requests === 1 ? "request" : "requests"}
            </span>
          </div>

          {requests === 0 ? (
            <Card className="px-4 py-10 text-center text-sm text-muted-foreground">
              No feature requests yet. Add the first one above.
            </Card>
          ) : (
            <Card className="divide-y p-0">
              {rows.map((r) => {
                const priorityMeta = featureRequestPriorityMeta[r.priority];
                const raisedBy = r.submittedByName ?? r.submittedByLegacy;
                const audit = lastChanged.get(r.id);
                return (
                  <div key={r.id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{r.title}</p>
                        <Badge variant={priorityMeta.variant}>{priorityMeta.label}</Badge>
                        {r.category ? (
                          <span className="text-xs text-muted-foreground">{r.category}</span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-sm whitespace-pre-wrap text-muted-foreground">
                        {r.description}
                      </p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {raisedBy ? `${raisedBy} · ` : ""}
                        <time
                          dateTime={r.createdAt?.toISOString()}
                          title={formatDateTime(r.createdAt)}
                        >
                          {formatRelativeTime(r.createdAt)}
                        </time>
                      </p>
                      {audit ? (
                        <p className="text-xs text-muted-foreground">
                          {audit.actorName ?? "Scheduled job"} {auditActionLabel(audit.action)},{" "}
                          <time
                            dateTime={audit.createdAt.toISOString()}
                            title={formatDateTime(audit.createdAt)}
                          >
                            {formatRelativeTime(audit.createdAt, now)}
                          </time>
                        </p>
                      ) : null}
                    </div>
                    <div className="shrink-0">
                      <FeatureRequestStatusSelect
                        id={r.id}
                        status={r.status}
                        title={r.title}
                        className="sm:items-end"
                      />
                    </div>
                  </div>
                );
              })}
            </Card>
          )}

          <AdminPagination
            page={page}
            total={requests}
            label="Feature request pages"
            hrefFor={(n) => `/admin/feature-requests?page=${n}`}
          />
        </section>
      </div>
    </AdminShell>
  );
}
