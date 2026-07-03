import { Inbox } from "lucide-react";
import { desc } from "drizzle-orm";
import { db, tourRequests } from "@/db";
import { experiences } from "@/content/experiences";
import { t } from "@/i18n/config";
import { AdminShell } from "@/components/admin/admin-shell";
import { PlaceholderPanel } from "@/components/admin/placeholder-panel";
import { RequestStatusSelect } from "@/components/admin/request-status-select";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { formatDate, requestStatusMeta } from "@/lib/admin-format";

// Reads live data — never prerender at build time.
export const dynamic = "force-dynamic";

/** Map experience slugs to a readable (English) label for the admin table. */
const experienceLabel = new Map(experiences.map((e) => [e.slug, t(e.title, "en")]));

function labelFor(slug: string | null): string {
  if (!slug) return "—";
  return experienceLabel.get(slug) ?? slug;
}

export default async function AdminSubmissionsPage() {
  const rows = await db.select().from(tourRequests).orderBy(desc(tourRequests.createdAt));

  if (rows.length === 0) {
    return (
      <AdminShell title="Submissions">
        <PlaceholderPanel
          icon={Inbox}
          title="No submissions yet"
          description="Once customers submit the booking form, their enquiries appear here for the team to review and follow up."
        />
      </AdminShell>
    );
  }

  return (
    <AdminShell title="Submissions">
      <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
        <Inbox className="size-4" />
        <span>
          {rows.length} {rows.length === 1 ? "enquiry" : "enquiries"}
        </span>
      </div>

      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[860px] text-sm">
          <thead>
            <tr className="border-b text-left text-xs text-muted-foreground uppercase tracking-wide">
              <th className="px-4 py-3 font-medium">Contact</th>
              <th className="px-4 py-3 font-medium">Experience</th>
              <th className="px-4 py-3 font-medium">Add-ons</th>
              <th className="px-4 py-3 font-medium">Party</th>
              <th className="px-4 py-3 font-medium">Preferred</th>
              <th className="px-4 py-3 font-medium">Received</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const meta = requestStatusMeta[r.status];
              return (
                <tr key={r.id} className="border-b align-top last:border-0">
                  <td className="px-4 py-3">
                    <div className="font-medium">{r.name}</div>
                    <a
                      href={`mailto:${r.email}`}
                      className="text-muted-foreground hover:text-primary"
                    >
                      {r.email}
                    </a>
                    {r.phone ? (
                      <div className="text-xs text-muted-foreground">{r.phone}</div>
                    ) : null}
                    {r.message ? (
                      <p className="mt-1 max-w-xs text-xs text-muted-foreground">{r.message}</p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    {labelFor(r.experienceSlug)}
                    <div className="text-xs text-muted-foreground uppercase">{r.locale}</div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {r.addOns.length > 0 ? r.addOns.map(labelFor).join(", ") : "—"}
                  </td>
                  <td className="px-4 py-3">{r.partySize ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{r.preferredDate ?? "—"}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                    {formatDate(r.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col items-start gap-1.5">
                      <Badge variant={meta.variant}>{meta.label}</Badge>
                      <RequestStatusSelect id={r.id} status={r.status} />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </AdminShell>
  );
}
