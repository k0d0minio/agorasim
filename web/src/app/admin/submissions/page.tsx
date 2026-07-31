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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
      <AdminShell>
        <PlaceholderPanel
          icon={Inbox}
          title="No submissions yet"
          description="Once customers submit the booking form, their enquiries appear here for the team to review and follow up."
        />
      </AdminShell>
    );
  }

  return (
    <AdminShell>
      <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
        <Inbox className="size-4" />
        <span>
          {rows.length} {rows.length === 1 ? "enquiry" : "enquiries"}
        </span>
      </div>

      <Card className="overflow-x-auto p-0">
        <Table className="min-w-[860px]">
          <TableHeader>
            <TableRow>
              <TableHead>Contact</TableHead>
              <TableHead>Experience</TableHead>
              <TableHead>Add-ons</TableHead>
              <TableHead>Party</TableHead>
              <TableHead>Preferred</TableHead>
              <TableHead>Received</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => {
              const meta = requestStatusMeta[r.status];
              return (
                <TableRow key={r.id} className="align-top">
                  <TableCell>
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
                  </TableCell>
                  <TableCell>
                    {labelFor(r.experienceSlug)}
                    <div className="text-xs text-muted-foreground uppercase">{r.locale}</div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {r.addOns.length > 0 ? r.addOns.map(labelFor).join(", ") : "—"}
                  </TableCell>
                  <TableCell>{r.partySize ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{r.preferredDate ?? "—"}</TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {formatDate(r.createdAt)}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col items-start gap-1.5">
                      <Badge variant={meta.variant}>{meta.label}</Badge>
                      <RequestStatusSelect id={r.id} status={r.status} />
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </AdminShell>
  );
}
