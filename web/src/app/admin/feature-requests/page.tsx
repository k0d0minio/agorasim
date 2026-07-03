import { Lightbulb } from "lucide-react";
import { desc } from "drizzle-orm";
import { db, featureRequests } from "@/db";
import { AdminShell } from "@/components/admin/admin-shell";
import { FeatureRequestForm } from "@/components/admin/feature-request-form";
import { FeatureRequestStatusSelect } from "@/components/admin/feature-request-status-select";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  formatDate,
  featureRequestStatusMeta,
  featureRequestPriorityMeta,
} from "@/lib/admin-format";

// Reads live data — never prerender at build time.
export const dynamic = "force-dynamic";

export default async function AdminFeatureRequestsPage() {
  const rows = await db.select().from(featureRequests).orderBy(desc(featureRequests.createdAt));

  return (
    <AdminShell title="Feature requests">
      <div className="flex flex-col gap-8">
        <FeatureRequestForm />

        <section className="flex flex-col gap-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Lightbulb className="size-4" />
            <span>
              {rows.length} {rows.length === 1 ? "request" : "requests"}
            </span>
          </div>

          {rows.length === 0 ? (
            <Card className="px-4 py-10 text-center text-sm text-muted-foreground">
              No feature requests yet. Add the first one above.
            </Card>
          ) : (
            <Card className="divide-y p-0">
              {rows.map((r) => {
                const statusMeta = featureRequestStatusMeta[r.status];
                const priorityMeta = featureRequestPriorityMeta[r.priority];
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
                        {r.submittedBy ? `${r.submittedBy} · ` : ""}
                        {formatDate(r.createdAt)}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-start gap-1.5 sm:items-end">
                      <Badge variant={statusMeta.variant}>{statusMeta.label}</Badge>
                      <FeatureRequestStatusSelect id={r.id} status={r.status} />
                    </div>
                  </div>
                );
              })}
            </Card>
          )}
        </section>
      </div>
    </AdminShell>
  );
}
